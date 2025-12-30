import { useContext } from "react";
import { assets } from "../../assets/assets";
import "./main.css";
import { Context } from "../../context/Context";
import React, { useState, useEffect, useRef } from "react";
import Dropdown from "../dropdown/Dropdown";
import { TypeAnimation } from 'react-type-animation';
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import { getApiBaseUrl } from "../../services/auth";
import { getToken } from "../../services/authToken";

const Main = ({ user }) => {
	const {
		onSent,
		onRender,
		newChat,
		recentPrompt,
		showResults,
		setRecentPrompt,
		setShowResults,
		setResultData,
		setLoading,
		loading,
		resultData,
		setInput,
		input,
		evenData,
		setEvenData,
		graphData,
		setGraphData,
		downloadData,
		setDownloadData,
		socket,
		setSocket,
		agentData,
		setAgentData,
		setPrevResults,
		prevPrompts,
		setPrevPrompts,
		setResultsTable,
		setResultsUpdatedAt,
		chatNo,
		setChatNo,
		fileHistory,
		setFileHistory,
		resp,
		isUpload,
		setIsUpload,
		activeThreadId,
		chatMessages,
		createThread,
		appendMessage,
		persistMessage,
		startRenderCycle,
		cancelRenderCycle,
	} = useContext(Context);
	const [socket1, setSocket1] = useState(null);

	const resultDataRef = useRef(null); // Reference to the result-data container for auto scrolling
	const agentDataRef = useRef(null);
	const agent = useRef(true);
	const pendingThreadIdRef = useRef(null);
	const abortControllerRef = useRef(null);
	const isProcessingRef = useRef(false);

	const [markdownContent, setMarkdownContent] = useState('');
	const [reccQs, setReccQs] = useState([])
	const [isChecked, setIsChecked] = useState(false);
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const [mainWsStatus, setMainWsStatus] = useState("disconnected");
	const [agentWsStatus, setAgentWsStatus] = useState("disconnected");
	const [feedbackChoice, setFeedbackChoice] = useState(null);
	const [feedbackStatus, setFeedbackStatus] = useState("idle");
	const responseIdRef = useRef(null);
	const [isProcessing, setIsProcessing] = useState(false);
	const [selectedModel, setSelectedModel] = useState("gpt-4o-mini");

	const ToggleSwitch = ({ label }) => {

		const handleToggle = () => {
			// isChecked.current = !isChecked.current; // Toggle the checkbox state
			setIsChecked(!isChecked);
			let query = !isChecked
			if (socket && socket.readyState === WebSocket.OPEN) {
				socket.send(JSON.stringify({ type: 'toggleRag', query }));
			}
		};

		return (
			<div className="container">
				{label}{" "}
				<div className="toggle-switch">
					<input
						type="checkbox"
						className="checkbox"
						name={label}
						id={label}
						checked={isChecked} // Control checkbox based on state
						onChange={handleToggle} // Call handleToggle on checkbox change
					/>
					<label className="label" htmlFor={label}>
						<span className="inner" />
						<span className="switch" />
					</label>
				</div>
			</div>
		);
	};

	const handleMarkdownChange = (e) => {
		setMarkdownContent(e.target.value);
	};

	const textAreaRef = useRef(null);
	const dropdownRef = useRef(null);
	const buttonContainerRef = useRef(null);

	const generatePDF = () => {
		// Send the raw Markdown content to the backend
		fetch('http://172.26.189.83:5001/convert', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ content: markdownContent }),
		})
			.then(response => {
				if (!response.ok) {
					throw new Error('Failed to send data to the backend');
				}
				return response.json(); // Expecting a JSON response
			})
			.then(data => {
				console.log('Markdown content sent successfully to backend:', data.message);

				// Now fetch the generated HTML from the backend after it's processed
				return fetch('http://172.26.189.83:5001/download-pdf', {
					method: 'GET',
				});
			})
			.then(response => {
				if (!response.ok) {
					throw new Error('Failed to fetch the generated HTML');
				}
				return response.text(); // Convert the response to plain text (HTML content)
			})
			.then(htmlContent => {
				// Open the HTML content in a new tab
				const newTab = window.open();
				if (newTab) {
					newTab.document.open();
					newTab.document.write(htmlContent);
					newTab.document.close();
				} else {
					console.error('Failed to open a new Tab')
				}

			})
			.catch(error => {
				console.error('Error during the process:', error);
			});
	};


	// Auto-scrolling effect when resultData changes
	useEffect(() => {
		if (resultDataRef.current) {
			resultDataRef.current.scrollTop = resultDataRef.current.scrollHeight;
		}
	}, [resultData, agentData, chatMessages, loading]);
	useEffect(() => {
		if (agentDataRef.current) {
			agentDataRef.current.scrollTop = agentDataRef.current.scrollHeight;
		}
	}, [agentData]);

	useEffect(() => {
		setFeedbackChoice(null);
		setFeedbackStatus("idle");
	}, [activeThreadId]);

	useEffect(() => {
		if (!activeThreadId) {
			isProcessingRef.current = false;
			setIsProcessing(false);
			setLoading(false);
			cancelRenderCycle();
		}
	}, [activeThreadId, cancelRenderCycle, setLoading]);

	useEffect(() => {
		if (!downloadData || !pendingThreadIdRef.current) {
			return;
		}
		const threadId = pendingThreadIdRef.current;
		const answerText = agent.current ? agentData : (markdownContent || resultData);
		if (!answerText) {
			return;
		}
		const assistantMessage = {
			role: "assistant",
			content: answerText,
			source: agent.current ? "agent" : "main",
			response_id: responseIdRef.current,
			created_at: new Date().toISOString(),
		};
		appendMessage(threadId, assistantMessage);
		persistMessage(threadId, assistantMessage);
		pendingThreadIdRef.current = null;
		setResultData("");
		setAgentData("");
	}, [downloadData, markdownContent, agentData, resultData, appendMessage, persistMessage, setResultData, setAgentData]);


	const handleCardClick = (promptText) => {
		setInput(promptText);
	};

	const displayName = user?.name || user?.email || "Researcher";
	const shortName = displayName.split(" ")[0];
	const displayEmail = user?.email || "";

	const handleClick = async () => {
		const trimmedInput = input.trim();
		if (!trimmedInput || isProcessingRef.current) {
			return;
		}
		const historySnapshot = chatMessages.slice(-6).map((message) => ({
			role: message.role,
			content: message.content,
		}));
		startRenderCycle();
		isProcessingRef.current = true;
		setIsProcessing(true);
		let threadId = activeThreadId;
		if (!threadId) {
			threadId = await createThread(trimmedInput.slice(0, 60));
		}
		if (!threadId) {
			isProcessingRef.current = false;
			setIsProcessing(false);
			return;
		}

		setInput("");
		setResultData("");
		setShowResults(true);
		setLoading(true);
		setDownloadData(false);
		setFeedbackChoice(null);
		setFeedbackStatus("idle");
		responseIdRef.current = `resp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
		resp.current = true;
		setRecentPrompt(trimmedInput);
		if (chatNo == 0) {
			setPrevPrompts(prev => [...prev, trimmedInput]);
		}
		setChatNo(chatNo + 1);

		const userMessage = {
			role: "user",
			content: trimmedInput,
			created_at: new Date().toISOString(),
		};
		appendMessage(threadId, userMessage);
		persistMessage(threadId, userMessage);
		pendingThreadIdRef.current = threadId;

		let query = trimmedInput;
		if (socket && socket.readyState === WebSocket.OPEN) {
			socket.send(JSON.stringify({ type: 'query', query, thread_id: threadId, history: historySnapshot, response_id: responseIdRef.current, model: selectedModel }));
		}
		try {
			const controller = new AbortController();
			abortControllerRef.current = controller;
			await fetch('http://172.26.189.83:5001/query', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ query: trimmedInput, thread_id: threadId, response_id: responseIdRef.current }),
				signal: controller.signal,
			});

			console.log('Query sent successfully!');

		} catch (error) {
			if (error.name === "AbortError") {
				return;
			}
			console.error('Error sending query to backend:', error);
			setLoading(false);
		}
	}

	const handleAbort = () => {
		if (!isProcessingRef.current) {
			return;
		}
		isProcessingRef.current = false;
		setIsProcessing(false);
		resp.current = false;
		setLoading(false);
		setDownloadData(false);
		cancelRenderCycle();

		const controller = abortControllerRef.current;
		if (controller) {
			controller.abort();
			abortControllerRef.current = null;
		}

		const abortPayload = JSON.stringify({
			type: "abort",
			thread_id: pendingThreadIdRef.current,
			response_id: responseIdRef.current,
		});
		if (socket && socket.readyState === WebSocket.OPEN) {
			socket.send(abortPayload);
		}
		if (socket1 && socket1.readyState === WebSocket.OPEN) {
			socket1.send(abortPayload);
		}
		pendingThreadIdRef.current = null;
	};

	useEffect(() => {
		if (!downloadData) {
			return;
		}
		isProcessingRef.current = false;
		setIsProcessing(false);
		abortControllerRef.current = null;
	}, [downloadData]);

	const handleFeedback = async (rating) => {
		if (!downloadData || feedbackStatus === "sending") {
			return;
		}

		const apiBaseUrl = getApiBaseUrl() || "http://172.26.189.83:5001";
		const token = getToken();
		const answerText = agent.current ? agentData : (markdownContent || resultData);

		setFeedbackChoice(rating);
		setFeedbackStatus("sending");

		try {
			const response = await fetch(`${apiBaseUrl}/api/feedback`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(token ? { Authorization: `Bearer ${token}` } : {}),
				},
				body: JSON.stringify({
					rating,
					prompt: recentPrompt,
					answer: answerText,
					source: agent.current ? "agent" : "main",
					response_id: responseIdRef.current,
					user: {
						name: user?.name || "",
						email: user?.email || "",
					},
				}),
			});

			if (!response.ok) {
				throw new Error("Feedback request failed");
			}
			setFeedbackStatus("sent");
		} catch (error) {
			console.error("Error submitting feedback:", error);
			setFeedbackStatus("error");
		}
	};

	// Adjust textarea height dynamically
	const adjustHeight = () => {
		const textArea = textAreaRef.current;

		// Reset the height to auto to shrink it before resizing
		textArea.style.height = 'auto';

		// Adjust the height based on scrollHeight
		textArea.style.height = `${textArea.scrollHeight}px`;

		// Move the textarea upwards by adjusting margin-top dynamically
		const diff = textArea.scrollHeight - textArea.clientHeight;
	};

	// Adjust height when input changes
	useEffect(() => {
		adjustHeight();
	}, [input]);

	const handleFileChange = async (event) => {
		const files = event.target.files;
		await setEvenData(event);

		if (files.length > 0) {
			const formData = new FormData();

			// Append each selected file to the FormData object
			for (let i = 0; i < files.length; i++) {
				formData.append('file', files[i]);

				// Update fileHistory state by adding new file info
				setFileHistory((prevFileHistory) => [
					...prevFileHistory,
					{
						fileName: files[i].name,
						fileSize: files[i].size,
						fileType: files[i].type,
						timestamp: new Date().toLocaleString(),
					},
				]);

				try {
					// Send a POST request
					const response = await fetch('http://172.26.189.83:8000/upload', {
						method: 'POST',
						body: formData,
					});

					if (response.ok) {
						const result = await response.json();
						console.log('Files uploaded successfully:', result);
						setIsUpload(true);
						setTimeout(() => {
							setIsUpload(false);
						}, 1000);
						// Update file history after successful upload


					} else {
						console.error('Error uploading files:', response.statusText);
					}
				} catch (error) {
					console.error('Error during upload:', error);
				}
			}
		};
		setIsDropdownOpen(false)
	}

	const triggerFileInput = () => {

		document.getElementById('hiddenFileInput').click(); // Programmatically trigger click on hidden input
	};

	// Toggle the dropdown visibility
	const toggleDropdown = () => {
		setIsDropdownOpen(!isDropdownOpen);
	};

	// Close the dropdown
	const closeDropdown = () => {
		setIsDropdownOpen(false);
	};

	useEffect(() => {
		if (!isDropdownOpen) {
			return;
		}
		const handleClickOutside = (event) => {
			const dropdown = dropdownRef.current;
			const buttonContainer = buttonContainerRef.current;
			if (
				dropdown &&
				buttonContainer &&
				!dropdown.contains(event.target) &&
				!buttonContainer.contains(event.target)
			) {
				setIsDropdownOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isDropdownOpen]);

	useEffect(() => {

		try {
			const ws = new WebSocket('ws://172.26.189.83:8090');

			ws.onopen = () => {
				console.log('WebSocket connected to agent server');
				setAgentWsStatus("connected");

			};
			ws.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data);

					// ✅ HANDLE VERBOSE LOGS
					if (data.type === 'logs') {
						console.log("Agent logs:", data.response);
						agent.current = true;
						if (!isProcessingRef.current) {
							return;
						}
						setAgentData(prev => prev + data.response);  // ensure UI updates
						setMarkdownContent(prev => prev + data.response);
					}

					// ✅ HANDLE SIDEBAR RESULTS (CSV)
					else if (data.type === 'results') {
						if (!isProcessingRef.current) {
							return;
						}
						const columns = Array.isArray(data.columns) ? data.columns.filter(Boolean) : [];
						const rows = Array.isArray(data.rows) ? data.rows : [];
						setResultsTable({ columns, rows });
						setResultsUpdatedAt(Date.now());
					}

				} catch (error) {
					console.error('Error parsing WebSocket message:', error);
				}
			};

			ws.onclose = () => {
				console.log('WebSocket disconnected');
				setAgentWsStatus("disconnected");
			};
			ws.onerror = () => {
				setAgentWsStatus("error");
			};
			setSocket1(ws);
			return () => {
				ws.close();
			};
		}
		catch (error) {
			console.error('Verbose WebSocket Server Not Connected', error);
		}
	}, []);

	useEffect(() => {
		const ws = new WebSocket('ws://172.26.189.83:8080');
		try {
			ws.onopen = () => {
				console.log('WebSocket connected');
				setMainWsStatus("connected");
			};
			ws.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data);
					// console.log(data);
					if (data.type === 'graph') {
						if (!isProcessingRef.current) {
							return;
						}

						const graph = JSON.parse(data.response);
						console.log(graph);
						setGraphData(graph);

					} else if (data.type === 'response') {
						if (!isProcessingRef.current) {
							return;
						}
						agent.current = false;
						onRender(data.response);
						console.log(data.response);
						setMarkdownContent(data.response);
					}
					else if (data.type === 'questions') {
						console.log(data.response);
						setReccQs(data.response);
					}
				} catch (error) {
					console.error('Error parsing WebSocket message:', error);
				}
			};
			ws.onclose = () => {
				console.log('WebSocket disconnected');
				setMainWsStatus("disconnected");
			};
			ws.onerror = () => {
				setMainWsStatus("error");
			};
			setSocket(ws);
			return () => {
				ws.close();
			};
		}
		catch (error) {
			console.error('Main WebSocket Server Not Connected', error);
		}
	}, []);

	return (

		<div className="main" tabIndex="0" onKeyDown={(e) => {
			if (e.key === 'Enter' && !isProcessingRef.current) {
				e.preventDefault();
				handleClick();
			}
		}}>
			<div className="nav">
				<img src={assets.main_logo} className="pway" alt="" />
				<div className="rightside">
					<div className="status-stack">
						<span className={`status-pill ${mainWsStatus}`}>Main WS</span>
						<span className={`status-pill ${agentWsStatus}`}>Agent WS</span>
					</div>
					<Dropdown selectedModel={selectedModel} onModelChange={setSelectedModel} />
					<ToggleSwitch label={"Docs"} />
					<div className="user-meta">
						<p className="user-name">{shortName}</p>
						{displayEmail && <p className="user-email">{displayEmail}</p>}
					</div>
					<img src={assets.user} className="user" alt="" />
				</div>
			</div>
			<div className="main-content">
				<div className="main-container" >
					{!showResults ? (
						<>
							<div className="contain">
								<div className="greet">
									<TypeAnimation
										sequence={[
											`Hello, ${shortName}!`,
										]}
										speed={{ type: 'keyStrokeDelayInMs', value: 100 }}
										style={{ fontSize: '1em' }}
									/>
									<p style={{ fontSize: '0.75em' }}>
										What would you like to explore today?
									</p>
								</div>
								<div className="cards">
									<div
										className="card"
										onClick={() =>
											handleCardClick(
												"Summarize the latest RAN meeting outcomes for Release 18."
											)
										}
									>
										<p style={{ textAlign: "justify" }}>
											Summarize the latest RAN meeting outcomes for Release 18.
										</p>
										{/* <img src={assets.compass_icon} alt="" /> */}
									</div>
									<div
										className="card"
										onClick={() => {
											handleCardClick(
												"Find documents about sidelink enhancements and cite the top sources."
											);
										}}
									>
										<p style={{ textAlign: "justify" }}>
											Find documents about sidelink enhancements and cite the top sources.
										</p>
									</div>
									<div
										className="card"
										onClick={() =>
											handleCardClick(
												"Compare TS 38.331 vs TS 38.321 and list key differences."
											)
										}
									>
										<p style={{ textAlign: "justify" }}>
											Compare TS 38.331 vs TS 38.321 and list key differences.</p>
										{/* <img src={assets.message_icon} alt="" /> */}
									</div>
									<div
										className="card"
										onClick={() =>
											handleCardClick(
												"Show me the most relevant documents for NR positioning accuracy."
											)
										}
									>
										<p style={{ textAlign: "justify" }}>
											Show me the most relevant documents for NR positioning accuracy.
										</p>
									</div>
									{/* Your card elements here */}
								</div>
							</div>

						</>
					) : (
						<div className="result" ref={resultDataRef}>
							<div className="chat-thread">
								{chatMessages.map((message, index) => {
									const role = (message.role || "assistant").toLowerCase();
									return (
										<div
											key={message.id || index}
											className={`chat-row ${role}`}
										>
											<img
												src={role === "user" ? assets.user : assets.pway_icon}
												className="chat-avatar"
												alt=""
											/>
											<div className={`chat-bubble ${role}`}>
												{role === "user" ? (
													<p>{message.content}</p>
												) : (
													<ReactMarkdown
														rehypePlugins={[rehypeRaw]}
														remarkPlugins={[remarkGfm]}
														components={{
															a: ({ href, children }) => (
																<a href={href} target="_blank" rel="noopener noreferrer">
																	{children}
																</a>
															)
														}}
													>
														{message.content}
													</ReactMarkdown>
												)}
											</div>
										</div>
									);
								})}
								{(loading || resultData || agentData) && (
									<div className="chat-row assistant">
										<img src={assets.pway_icon} className="chat-avatar" alt="" />
										<div className="chat-bubble assistant">
											{loading ? (
												<div className="loader">
													<hr />
													<hr />
													<hr />
												</div>
											) : (
												<ReactMarkdown
													rehypePlugins={[rehypeRaw]}
													remarkPlugins={[remarkGfm]}
													components={{
														a: ({ href, children }) => (
															<a href={href} target="_blank" rel="noopener noreferrer">
																{children}
															</a>
														)
													}}
												>
													{agent.current ? agentData : resultData}
												</ReactMarkdown>
											)}
										</div>
									</div>
								)}
							</div>
							{downloadData &&
								<div className="result-data feedback-row" ref={agentDataRef} style={{ overflow: 'auto' }}>
									<button
										type="button"
										className="download-button"
										onClick={generatePDF}
										title="Download report"
										aria-label="Download report"
									>
										<img src={assets.download_icon} alt="" />
									</button>
									<div className="feedback-actions" aria-label="Rate this answer">
										<button
											type="button"
											className={`feedback-button up ${feedbackChoice === "up" ? "active" : ""}`}
											onClick={() => handleFeedback("up")}
											disabled={feedbackStatus === "sending"}
											title="Thumbs up"
											aria-label="Thumbs up"
										>
											<svg viewBox="0 0 24 24" aria-hidden="true">
												<path
													fill="currentColor"
													d="M2 21h4V9H2v12zm20-11c0-1.1-.9-2-2-2h-6.3l1-4.6.03-.32c0-.41-.17-.79-.44-1.06L13 1 7.6 6.4C7.22 6.78 7 7.3 7 7.83V19c0 1.1.9 2 2 2h7c.82 0 1.54-.5 1.84-1.22l3-7.05c.1-.23.16-.48.16-.73V10z"
												/>
											</svg>
										</button>
										<button
											type="button"
											className={`feedback-button down ${feedbackChoice === "down" ? "active" : ""}`}
											onClick={() => handleFeedback("down")}
											disabled={feedbackStatus === "sending"}
											title="Thumbs down"
											aria-label="Thumbs down"
										>
											<svg viewBox="0 0 24 24" aria-hidden="true">
												<path
													fill="currentColor"
													d="M22 3h-4v12h4V3zM2 14c0 1.1.9 2 2 2h6.3l-1 4.6-.03.32c0 .41.17.79.44 1.06L11 23l5.4-5.4c.38-.38.6-.9.6-1.43V5c0-1.1-.9-2-2-2H8c-.82 0-1.54.5-1.84 1.22l-3 7.05c-.1.23-.16.48-.16.73V14z"
												/>
											</svg>
										</button>
									</div>
								</div>

							}

							{downloadData && <h1 className="result-data" style={{ marginBottom: '10px' }}>Recommended Questions</h1>}
							<div className="result-data" ref={agentDataRef} style={{ display: 'flex', gap: '10px' }}>
								{downloadData &&
									<div
										className="card"
										style={{
											minHeight: '10vh',
											width: '33%',  // Allow each card to take up to 33% of the width
											marginRight: '20px',
											display: 'flex',  // Ensure the card uses flexbox
											flexDirection: 'column',  // Align content vertically
											justifyContent: 'center',  // Center the text vertically within the card
											alignItems: 'center',  // Center text horizontally
											overflow: 'hidden',  // Hide overflow if text exceeds the card's boundaries
											//wordWrap: 'break-word',  // Break long words if needed to fit inside the card
											textOverflow: 'ellipsis',  // Show ellipsis if the text is too long
										}}
										onClick={() => handleCardClick(reccQs[0])}
									>
										<p style={{ textAlign: "left", fontSize: '15px', margin: '0px 6px', padding: '2px' }}>{reccQs[0]}</p>
									</div>
								}

								{downloadData &&
									<div
										className="card"
										style={{
											minHeight: '10vh',
											width: '33%',  // Allow each card to take up to 33% of the width
											marginRight: '20px',
											display: 'flex',
											flexDirection: 'column',
											justifyContent: 'center',
											alignItems: 'center',
											overflow: 'hidden',  // Hide overflow if text exceeds the card's boundaries
											//wordWrap: 'break-word',  // Break long words if needed to fit inside the card
											textOverflow: 'ellipsis',  // Show ellipsis if the text is too long
										}}
										onClick={() => handleCardClick(reccQs[1])}
									>
										<p style={{ textAlign: "left", fontSize: '15px', margin: '0px 6px', padding: '2px' }}>{reccQs[1]}</p>
									</div>
								}

								{downloadData &&
									<div
										className="card"
										style={{
											minHeight: '10vh',
											width: '33%',  // Allow each card to take up to 33% of the width
											display: 'flex',
											flexDirection: 'column',
											justifyContent: 'center',
											alignItems: 'center',
											overflow: 'hidden',  // Hide overflow if text exceeds the card's boundaries
											// wordWrap: 'break-word',  // Break long words if needed to fit inside the card
											textOverflow: 'ellipsis',  // Show ellipsis if the text is too long
										}}
										onClick={() => handleCardClick(reccQs[2])}
									>
										<p style={{ textAlign: "left", fontSize: '15px', margin: '0px 6px', padding: '2px' }}>{reccQs[2]}</p>
									</div>
								}
							</div>
						</div>
					)}
				</div>
				<div className="main-bottom">
					<div className="search-box">
						<textarea
							ref={textAreaRef}
							onChange={(e) => setInput(e.target.value)}
							value={input}
							placeholder="Ask about meetings, releases, specs, or upload docs..."
							rows={1} // Start with 1 row
							style={{
								position: 'relative',
								background: '#f0f4f9',
								outline: 'none',
								border: 'none',
								width: '100%',
								minHeight: '40px', // Minimum height for the textarea
								maxHeight: '100px',
								resize: 'none', // Disable manual resize by the user
								overflow: 'hidden', // Hide overflow to prevent scrollbars
								fontSize: '16px', // Adjust font size as needed
								borderRadius: '5px', // Rounded corners for style
								// overflowY: 'auto'
							}}
						/>
						<div className="button-container" ref={buttonContainerRef}>
							<img
								src={assets.attach_icon}
								className="upload"
								onClick={!isProcessing ? toggleDropdown : null}
								alt=""
							/>
							{isProcessing ? (
								<button
									type="button"
									className="stop-button"
									onClick={handleAbort}
									aria-label="Stop generating"
								>
									<span className="stop-icon" aria-hidden="true" />
								</button>
							) : (
								<img
									src={assets.send_icon}
									alt=""
									onClick={!isProcessing ? handleClick : null}
								/>
							)}
						</div>
					</div>
					<div className="bottom-info">
						<p></p>
					</div>
				</div>
				{/* Overlay and Dropdown */}
				{isDropdownOpen && (
					<>
						{/* Overlay */}
						<div className="overlay" onClick={closeDropdown}></div>

						{/* Dropdown Content */}
						<div
							id="dropdown"
							ref={dropdownRef}
							className="dropdown-content"
						>
							<div>
								<button onClick={triggerFileInput}>Upload from Computer</button>
								<input
									multiple
									id="hiddenFileInput"
									type="file"
									style={{ display: "none" }}
									onChange={handleFileChange}
								/>
							</div>
							<a
								href="https://drive.google.com/drive/folders/1bmB1oKZ3J8_Onbd-pQKbhiBDLi8AGls9"
								target="_blank"
								rel="noopener noreferrer"
							>
								<button onClick={closeDropdown}>Upload to Google Drive</button>
							</a>
						</div>
					</>
				)}
			</div>
		</div>
	);
};

export default Main;
