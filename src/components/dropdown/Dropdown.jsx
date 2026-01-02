import React from "react";

const Dropdown = ({
  selectedProvider,
  selectedModel,
  onProviderChange,
  onModelChange,
  modelOptions,
}) => {
  const handleProviderChange = (event) => {
    onProviderChange(event.target.value);
  };

  const handleModelChange = (event) => {
    onModelChange(event.target.value);
  };

  return (
    <div style={styles.container}>
      <select value={selectedProvider} onChange={handleProviderChange} style={styles.dropdown}>
        <option style={styles.opt} value="openai">OpenAI</option>
        <option style={styles.opt} value="deepseek">DeepSeek</option>
      </select>
      <select value={selectedModel} onChange={handleModelChange} style={styles.dropdown}>
        {(modelOptions[selectedProvider] || []).map((model) => (
          <option key={model} style={styles.opt} value={model}>
            {model}
          </option>
        ))}
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
    minWidth: "220px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },

  header: {
    fontSize: "18px",
    marginBottom: "10px",
  },
  dropdown: {
    padding: "10px",
    fontSize: "16px",
    width: "180px",
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
