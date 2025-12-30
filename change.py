"""
WebSocket server that watches pipeline files and streams updates to clients.

- ProcessLogs.md → plain appended logs
- Results.csv     → structured table for results panel
"""

import os
import time
import json
import threading
import asyncio
import websockets
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import queue
from pathlib import Path
import csv

DEFAULT_PIPELINE_ROOT = Path(__file__).resolve().parents[1] / "3GPP-pipeline"
PIPELINE_ROOT = Path(os.getenv("PIPELINE_ROOT", DEFAULT_PIPELINE_ROOT)).resolve()


class MyHandler(FileSystemEventHandler):
    def __init__(self, message_queue):
        super().__init__()
        self.message_queue = message_queue
        self.log_offset = 0

        self.watch_files = {
            PIPELINE_ROOT / "ProcessLogs.md": "logs",
            PIPELINE_ROOT / "Results.csv": "results"
        }

    def on_modified(self, event):
        self._handle_event(event.src_path)

    def on_created(self, event):
        self._handle_event(event.src_path)

    def on_moved(self, event):
        self._handle_event(event.dest_path)

    def _handle_event(self, src_path):
        resolved_path = Path(src_path).resolve()
        if resolved_path not in self.watch_files:
            return

        file_type = self.watch_files[resolved_path]
        if file_type == "logs":
            self.handle_logs(resolved_path)
        elif file_type == "results":
            self.handle_results(resolved_path)

    def handle_logs(self, path: Path):
        try:
            if path.stat().st_size < self.log_offset:
                self.log_offset = 0

            with open(path, "r") as f:
                f.seek(self.log_offset)
                new_content = f.read()
                self.log_offset = f.tell()

            if new_content.strip():
                self.message_queue.put({
                    "type": "logs",
                    "response": new_content
                })
        except FileNotFoundError:
            pass

    def handle_results(self, path: Path):
        try:
            with open(path, "r") as f:
                reader = csv.DictReader(f)
                rows = list(reader)

            self.message_queue.put({
                "type": "results",
                "format": "table",
                "columns": reader.fieldnames,
                "rows": rows
            })
        except FileNotFoundError:
            pass


def start_observer(message_queue):
    event_handler = MyHandler(message_queue)
    observer = Observer()
    observer.schedule(event_handler, path=str(PIPELINE_ROOT), recursive=False)
    observer.start()

    try:
        while True:
            time.sleep(0.3)
    except KeyboardInterrupt:
        observer.stop()

    observer.join()


async def handle_connection(websocket):
    print("Client connected")
    message_queue = queue.Queue()

    observer_thread = threading.Thread(
        target=start_observer,
        args=(message_queue,),
        daemon=True
    )
    observer_thread.start()

    try:
        while True:
            try:
                event_data = message_queue.get_nowait()
                await websocket.send(json.dumps(event_data))
            except queue.Empty:
                await asyncio.sleep(0.2)
    except websockets.exceptions.ConnectionClosed:
        print("Client disconnected")


async def main():
    print("WebSocket server running on ws://0.0.0.0:8090")
    async with websockets.serve(handle_connection, "0.0.0.0", 8090):
        await asyncio.Future()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nServer shutdown")
