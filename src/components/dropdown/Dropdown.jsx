import React from "react";

const Dropdown = ({ selectedModel, onModelChange }) => {
  // Handle dropdown change
  const handleChange = (event) => {
    onModelChange(event.target.value);
  };

  return (

    <div style={styles.container}>
      <select value={selectedModel} onChange={handleChange} style={styles.dropdown}>
        <option style={styles.opt} value="gpt-4o-mini">GPT 4-o mini</option>
        <option style={styles.opt} value="deepseek">DeepSeek</option>
      </select>
    </div>
  );
};

// Inline styles for simplicity
const styles = {
  container: {
    textAlign: "center",
    margin: "10px",
    // backgroundColor: "#f9f9f9",
    maxWidth: "1200px",
  },

  header: {
    fontSize: "18px",
    marginBottom: "10px",
  },
  dropdown: {
    padding: "10px",
    fontSize: "16px",
    width: "100%",
    borderRadius: "5px",
    border: "1px solid #ddd",
    outline: "none",
  },

  result: {
    marginTop: "20px",
    fontSize: "16px",
    color: "#333",
  },
};

export default Dropdown;
