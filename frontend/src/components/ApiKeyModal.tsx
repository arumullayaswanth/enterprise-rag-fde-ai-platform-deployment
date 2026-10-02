import { useState } from "react";
import { getApiKey, setApiKey } from "../api/client";

interface Props {
    onClose: () => void;
}

export function ApiKeyModal({ onClose }: Props) {
    const [value, setValue] = useState(getApiKey());

    function save() {
        setApiKey(value.trim());
        onClose();
    }

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <h3 style={{ marginTop: 0 }}>Connect to the API</h3>
                <p className="muted" style={{ fontSize: "0.88rem" }}>
                    When the backend runs with authentication on, requests need an{" "}
                    <code>x-api-key</code> header. Your key is stored only in this browser and sent
                    with each request.
                </p>
                <input
                    className="text"
                    type="password"
                    placeholder="Paste your API key"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    style={{ margin: "0.7rem 0 1.1rem" }}
                />
                <div className="row spread">
                    <button className="btn" onClick={onClose}>
                        Cancel
                    </button>
                    <button className="btn btn-primary" onClick={save}>
                        Save key
                    </button>
                </div>
            </div>
        </div>
    );
}
