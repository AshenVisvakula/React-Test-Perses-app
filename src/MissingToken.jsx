const MissingTokenMessage=()=> {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        textAlign: "center",
        color: "#666",
        fontSize: "16px",
      }}
    >
      <div>
        <h2>Access token required</h2>
        <p>The URL is missing an access token.</p>
      </div>
    </div>
  );
}

export default MissingTokenMessage;
