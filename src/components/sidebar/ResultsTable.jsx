import "./resultsTable.css";

const ResultsTable = ({ columns, rows }) => {
  if (!columns.length || !rows.length) {
    return <p className="empty">No results yet</p>;
  }

  return (
    <div className="results-table">
      <table>
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx}>
              {columns.map(col => (
                <td key={col}>{row[col]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ResultsTable;
