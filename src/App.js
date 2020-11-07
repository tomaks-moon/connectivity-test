import React from "react";
import { abbottFreeStyleLibre, minimed600 } from "./drivers";

function App() {
  const [isFslDisabled, setIsFslDisabled] = React.useState(false);
  const [isMinimedDisabled, setMinimedDisabled] = React.useState(false);
  return (
    <div className="App">
      <button
        onClick={async () => {
          setIsFslDisabled(true);
          console.log(await abbottFreeStyleLibre());
          setIsFslDisabled(false);
        }}
        disabled={isFslDisabled}
      >
        Freestyle Libre
      </button>
      <button
        onClick={() => {
          setMinimedDisabled(true);
          minimed600();
          setMinimedDisabled(false);
        }}
        disabled={isMinimedDisabled}
      >
        MiniMed 640G
      </button>
    </div>
  );
}

export default App;
