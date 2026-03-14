import { useState, useEffect } from "react";
import type { Vehicle, CheckItem, CheckItemKey, ErrorResponse } from "./types";
import { api } from "./api";
import { ToastType } from "./Toast";

const CHECK_ITEMS: CheckItemKey[] = [
  "TYRES",
  "BRAKES",
  "LIGHTS",
  "OIL",
  "COOLANT",
];

interface Props {
  onSuccess: () => void;
  showToast: (message: string, type: ToastType) => void;
}

export function CheckForm({ onSuccess, showToast }: Props) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [odometerKm, setOdometerKm] = useState("");
  const [items, setItems] = useState<CheckItem[]>(
    CHECK_ITEMS.map((key) => ({ key, status: "OK" })),
  );
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    api.getVehicles().then(setVehicles).catch(console.error);
  }, []);

  const handleItemStatusChange = (key: CheckItemKey, status: "OK" | "FAIL") => {
    setItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, status } : item)),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setValidationErrors([]);

    const odoValue = parseFloat(odometerKm);
    if (isNaN(odoValue) || odoValue <= 0) {
      setError("Please enter a valid positive number for odometer reading.");
      return;
    }

    setLoading(true);

    try {
      await api.createCheck({
        vehicleId: selectedVehicle,
        odometerKm: odoValue,
        items,
        note: note || undefined,
      });

      // Reset form and display success notification
      setSelectedVehicle("");
      setOdometerKm("");
      setNote("");
      setItems(CHECK_ITEMS.map((key) => ({ key, status: "OK" })));
      showToast("Inspection check submitted successfully", "success");
      onSuccess();
    } catch (err: unknown) {
      const errorResponse = err as ErrorResponse;
      if (errorResponse.error?.details) {
        setValidationErrors(
          errorResponse.error.details.map((d) => `${d.field}: ${d.reason}`),
        );
        showToast("Validation failed. Please check the form.", "error");
      } else {
        const msg = errorResponse.error?.message || "Failed to submit check. Please try again.";
        setError(msg);
        showToast(msg, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="check-form">
      <h2>Submit Vehicle Inspection Result</h2>

      {error && <div className="error-banner">{error}</div>}
      {validationErrors.length > 0 && (
        <div className="error-banner">
          <strong>Validation errors:</strong>
          <ul>
            {validationErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="form-group">
        <label htmlFor="vehicle">Vehicle *</label>
        <select
          id="vehicle"
          value={selectedVehicle}
          onChange={(e) => setSelectedVehicle(e.target.value)}
          required>
          <option value="">Select a vehicle</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.registration} - {v.make} {v.model} ({v.year})
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="odometer">Odometer (km) *</label>
        <input
          id="odometer"
          type="number"
          step="any"
          value={odometerKm}
          onChange={(e) => setOdometerKm(e.target.value)}
          placeholder="Enter odometer reading"
          required
        />
      </div>

      <div className="form-group">
        <label>Checklist Items *</label>
        <div className="checklist">
          {items.map((item) => (
            <div key={item.key} className="checklist-item">
              <span className="item-label">{item.key}</span>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    name={`status-${item.key}`}
                    value="OK"
                    checked={item.status === "OK"}
                    onChange={() => handleItemStatusChange(item.key, "OK")}
                  />
                  <span>OK</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name={`status-${item.key}`}
                    value="FAIL"
                    checked={item.status === "FAIL"}
                    onChange={() => handleItemStatusChange(item.key, "FAIL")}
                  />
                  <span className="fail-text">FAIL</span>
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="note">Notes (Optional)</label>
        <div className="textarea-container">
          <textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add any additional notes here..."
            maxLength={300}
          />
          <span className={`char-counter ${note.length >= 300 ? "max" : ""}`}>
            {note.length}/300
          </span>
        </div>
      </div>

      <button type="submit" disabled={loading}>
        {loading ? "Submitting..." : "Submit Check"}
      </button>
    </form>
  );
}
