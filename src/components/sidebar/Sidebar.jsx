import "./sidebar.css";
import { assets } from "../../assets/assets";
import { useContext, useState } from "react";
import { Context } from "../../context/Context";
import Viewer from "../file/fileSystem";

const Sidebar = ({ onLogout }) => {
  const [extended, setExtended] = useState(true);

  const {
    threads,
    activeThreadId,
    selectThread,
    newChat,
    deleteThread,
    socket,
    setIsUpload,
    isUpload
  } = useContext(Context);

  const [isPopupVisible, setPopupVisible] = useState(false);
  const [isFilePopupVisible, setFilePopupVisible] = useState(false);

  const [formData, setFormData] = useState({
    GEMINI_API_KEY_30: "",
    OPEN_AI_API_KEY_30: "",
    TAVILY_API_KEY_30: "",
    VOYAGE_API_KEY: ""
  });

  // -------------------------
  // Popup controls
  // -------------------------
  const closePopup = () => {
    setPopupVisible(false);
    setFilePopupVisible(false);
    setIsUpload(false);
  };

  const openPopup = () => setPopupVisible(true);
  const openFilePopup = () => setFilePopupVisible(true);

  // -------------------------
  // Credentials form
  // -------------------------
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "cred", formData }));
    }
    closePopup();
  };

  return (
    <>
      <div className={`sidebar ${extended ? "extended" : "collapsed"}`}>
        {/* ---------------- TOP ---------------- */}
        <div className="top">
          <div className="buttons">
            <img
              src={assets.menu_icon}
              className="menu"
              title="Toggle Sidebar"
              onClick={() => setExtended(p => !p)}
            />
            <img
              src={assets.edit_icon}
              className="new"
              title="New Chat"
              onClick={newChat}
            />
          </div>
        </div>

        {/* ---------------- RECENT ---------------- */}
        <div className="recent">
          <p className="recent-title">Recent</p>
          {threads.map((thread) => (
            <div
              key={thread.id}
              className={`recent-entry ${String(activeThreadId) === String(thread.id) ? "active" : ""}`}
              onClick={() => selectThread(thread.id)}
            >
              <img src={assets.message_icon} alt="" />
              <p className="thread-title">
                {(thread.title || thread.last_message || "New chat").slice(0, 20)}...
              </p>
              {extended && (
                <button
                  type="button"
                  className="thread-delete"
                  onClick={(event) => {
                    event.stopPropagation();
                    deleteThread(thread.id);
                  }}
                  aria-label="Delete chat"
                  title="Delete chat"
                >
                  x
                </button>
              )}
            </div>
          ))}
        </div>

        {/* ---------------- BOTTOM ---------------- */}
        <div className="bottom">
          <div className="bottom-item recent-entry" onClick={openFilePopup}>
            <img src={assets.history_icon} alt="" title="Files" />
            {extended && <p>Files</p>}
          </div>

          <div className="bottom-item recent-entry" onClick={openPopup}>
            <img src={assets.setting_icon} alt="" title="Credentials" />
            {extended && <p>Credentials</p>}
          </div>

          <div
            className="bottom-item recent-entry"
            onClick={() => onLogout && onLogout()}
          >
            <img src={assets.user_icon} alt="" title="Logout" />
            {extended && <p>Logout</p>}
          </div>
        </div>
      </div>

      {/* ---------------- CREDENTIALS POPUP ---------------- */}
      {isPopupVisible && (
        <div className="popup">
          <div className="popup-overlay" onClick={closePopup}></div>
          <div className="popup-form">
            <h2>Credentials</h2>
            <form className="custom-form" onSubmit={handleSubmit}>
              <label>OpenAI API Key</label>
              <input
                name="OPEN_AI_API_KEY_30"
                value={formData.OPEN_AI_API_KEY_30}
                onChange={handleChange}
              />

              <label>Gemini API Key</label>
              <input
                name="GEMINI_API_KEY_30"
                value={formData.GEMINI_API_KEY_30}
                onChange={handleChange}
              />

              <label>Tavily API Key</label>
              <input
                name="TAVILY_API_KEY_30"
                value={formData.TAVILY_API_KEY_30}
                onChange={handleChange}
              />

              <label>Voyage API Key</label>
              <input
                name="VOYAGE_API_KEY"
                value={formData.VOYAGE_API_KEY}
                onChange={handleChange}
              />

              <button type="submit">Submit</button>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- FILE VIEWER ---------------- */}
      {isFilePopupVisible && (
        <div className="popup">
          <div className="popup-overlay" onClick={closePopup}></div>
          <div className="popup-form">
            <Viewer />
          </div>
        </div>
      )}

      {/* ---------------- UPLOAD SUCCESS ---------------- */}
      {isUpload && (
        <div className="popup">
          <div className="popup-overlay" onClick={closePopup}></div>
          <div className="popup-form">
            <h2>File Uploaded Successfully</h2>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
