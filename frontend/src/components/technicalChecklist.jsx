import React, { useState } from "react";

const TechnicalChecklist = ({ data, onChange, onSave }) => {
  const defaultData = {
    breakingForce: {
      max: {
        front: { left: '', right: '', sum: '', difference: '' },
        rear: { left: '', right: '', sum: '', difference: '' }
      },
      min: {
        front: { left: '', right: '', sum: '', difference: '' },
        rear: { left: '', right: '', sum: '', difference: '' }
      }
    },
    speedTesting: { speedometer: '', tester: '' },
    turningRadius: {
      inner: { left: '', right: '' },
      outer: { left: '', right: '' }
    },
    slipTester: [{ speed: '5kph', value: '' }],
    headlightTester: {
      lowBeam: {
        before: { left: '', right: '' },
        after: { left: '', right: '' }
      },
      highBeam: {
        before: { left: '', right: '' },
        after: { left: '', right: '' }
      }
    },
    absTesting: [{ option: 'a. Relay sound/Electric', remarks: '' }]
  };

  const [technicalData, setTechnicalData] = useState(data ? { ...defaultData, ...data } : defaultData);

  const updateBreakingForce = (type, side, field, value) => {
    const updated = { ...technicalData };
    updated.breakingForce[type][side][field] = value;
    setTechnicalData(updated);
    onChange(updated);
  };

  const updateSpeedTesting = (field, value) => {
    const updated = { ...technicalData };
    updated.speedTesting[field] = value;
    setTechnicalData(updated);
    onChange(updated);
  };

  const updateTurningRadius = (tire, hand, value) => {
    const updated = { ...technicalData };
    updated.turningRadius[tire][hand] = value;
    setTechnicalData(updated);
    onChange(updated);
  };

  const updateSlipTester = (idx, field, value) => {
    const updated = { ...technicalData };
    updated.slipTester[idx][field] = value;
    setTechnicalData(updated);
    onChange(updated);
  };

  const addSlipTester = () => {
    const updated = { ...technicalData };
    updated.slipTester.push({ speed: '', value: '' });
    setTechnicalData(updated);
    onChange(updated);
  };

  const deleteSlipTester = (idx) => {
    const updated = { ...technicalData };
    updated.slipTester.splice(idx, 1);
    setTechnicalData(updated);
    onChange(updated);
  };

  const updateHeadlightTester = (beam, adjustment, hand, value) => {
    const updated = { ...technicalData };
    updated.headlightTester[beam][adjustment][hand] = value;
    setTechnicalData(updated);
    onChange(updated);
  };

  const updateAbsTesting = (idx, field, value) => {
    const updated = { ...technicalData };
    updated.absTesting[idx][field] = value;
    setTechnicalData(updated);
    onChange(updated);
  };

  const addAbsTesting = () => {
    const updated = { ...technicalData };
    updated.absTesting.push({ option: '', remarks: '' });
    setTechnicalData(updated);
    onChange(updated);
  };

  const deleteAbsTesting = (idx) => {
    const updated = { ...technicalData };
    updated.absTesting.splice(idx, 1);
    setTechnicalData(updated);
    onChange(updated);
  };

  return (
    <div className="card bg-base-200 shadow-md p-4 md:p-6"> {/* ✅ Responsive: Adaptive padding */}
      <h4 className="text-lg font-semibold mb-4 text-success">Technical Checklist</h4>

      {/* I. Break Testing */}
      <div className="mb-6">
        <h5 className="text-md font-semibold mb-3 text-sm md:text-base">I. Break Testing (Breaking Force daN)</h5> {/* ✅ Responsive: Adaptive text size */}
        
        {/* Maximum Breaking Force */}
        <div className="mb-4 overflow-x-auto"> {/* ✅ Responsive: Horizontal scroll for table */}
          <table className="table w-full border min-w-150"> {/* ✅ Responsive: Min width for table */}
            <tbody>
              <tr>
                <th colSpan="4" className="text-center border font-bold">Maximum Breaking Force</th>
              </tr>
              <tr>
                <th className="border text-sm md:text-base">Front (Left Hand)</th> {/* ✅ Responsive: Adaptive text */}
                <th className="border text-sm md:text-base">Front (Right Hand)</th>
                <th className="border text-sm md:text-base">Sum</th>
                <th className="border text-sm md:text-base">Front Difference</th>
              </tr>
              <tr>
                <td className="border"><input type="number" value={technicalData.breakingForce?.max?.front?.left || ''} onChange={(e) => updateBreakingForce('max', 'front', 'left', e.target.value)} className="input input-bordered w-full" /></td>
                <td className="border"><input type="number" value={technicalData.breakingForce?.max?.front?.right || ''} onChange={(e) => updateBreakingForce('max', 'front', 'right', e.target.value)} className="input input-bordered w-full" /></td>
                <td className="border"><input type="number" value={technicalData.breakingForce?.max?.front?.sum || ''} onChange={(e) => updateBreakingForce('max', 'front', 'sum', e.target.value)} className="input input-bordered w-full" /></td>
                <td className="border"><input type="number" value={technicalData.breakingForce?.max?.front?.difference || ''} onChange={(e) => updateBreakingForce('max', 'front', 'difference', e.target.value)} className="input input-bordered w-full" /></td>
              </tr>
              <tr>
                <th className="border text-sm md:text-base">Rear (Left Hand)</th>
                <th className="border text-sm md:text-base">Rear (Right Hand)</th>
                <th className="border text-sm md:text-base">Sum</th>
                <th className="border text-sm md:text-base">Rear Difference</th>
              </tr>
              <tr>
                <td className="border"><input type="number" value={technicalData.breakingForce?.max?.rear?.left || ''} onChange={(e) => updateBreakingForce('max', 'rear', 'left', e.target.value)} className="input input-bordered w-full" /></td>
                <td className="border"><input type="number" value={technicalData.breakingForce?.max?.rear?.right || ''} onChange={(e) => updateBreakingForce('max', 'rear', 'right', e.target.value)} className="input input-bordered w-full" /></td>
                <td className="border"><input type="number" value={technicalData.breakingForce?.max?.rear?.sum || ''} onChange={(e) => updateBreakingForce('max', 'rear', 'sum', e.target.value)} className="input input-bordered w-full" /></td>
                <td className="border"><input type="number" value={technicalData.breakingForce?.max?.rear?.difference || ''} onChange={(e) => updateBreakingForce('max', 'rear', 'difference', e.target.value)} className="input input-bordered w-full" /></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Minimum Breaking Force */}
        <div className="overflow-x-auto"> {/* ✅ Responsive: Horizontal scroll for table */}
          <table className="table w-full border min-w-150"> {/* ✅ Responsive: Min width for table */}
            <tbody>
              <tr>
                <th colSpan="4" className="text-center border font-bold">Minimum Breaking Force</th>
              </tr>
              <tr>
                <th className="border text-sm md:text-base">Front (Left Hand)</th>
                <th className="border text-sm md:text-base">Front (Right Hand)</th>
                <th className="border text-sm md:text-base">Sum</th>
                <th className="border text-sm md:text-base">Front Difference</th>
              </tr>
              <tr>
                <td className="border"><input type="number" value={technicalData.breakingForce?.min?.front?.left || ''} onChange={(e) => updateBreakingForce('min', 'front', 'left', e.target.value)} className="input input-bordered w-full" /></td>
                <td className="border"><input type="number" value={technicalData.breakingForce?.min?.front?.right || ''} onChange={(e) => updateBreakingForce('min', 'front', 'right', e.target.value)} className="input input-bordered w-full" /></td>
                <td className="border"><input type="number" value={technicalData.breakingForce?.min?.front?.sum || ''} onChange={(e) => updateBreakingForce('min', 'front', 'sum', e.target.value)} className="input input-bordered w-full" /></td>
                <td className="border"><input type="number" value={technicalData.breakingForce?.min?.front?.difference || ''} onChange={(e) => updateBreakingForce('min', 'front', 'difference', e.target.value)} className="input input-bordered w-full" /></td>
              </tr>
              <tr>
                <th className="border text-sm md:text-base">Rear (Left Hand)</th>
                <th className="border text-sm md:text-base">Rear (Right Hand)</th>
                <th className="border text-sm md:text-base">Sum</th>
                <th className="border text-sm md:text-base">Rear Difference</th>
              </tr>
              <tr>
                <td className="border"><input type="number" value={technicalData.breakingForce?.min?.rear?.left || ''} onChange={(e) => updateBreakingForce('min', 'rear', 'left', e.target.value)} className="input input-bordered w-full" /></td>
                <td className="border"><input type="number" value={technicalData.breakingForce?.min?.rear?.right || ''} onChange={(e) => updateBreakingForce('min', 'rear', 'right', e.target.value)} className="input input-bordered w-full" /></td>
                <td className="border"><input type="number" value={technicalData.breakingForce?.min?.rear?.sum || ''} onChange={(e) => updateBreakingForce('min', 'rear', 'sum', e.target.value)} className="input input-bordered w-full" /></td>
                <td className="border"><input type="number" value={technicalData.breakingForce?.min?.rear?.difference || ''} onChange={(e) => updateBreakingForce('min', 'rear', 'difference', e.target.value)} className="input input-bordered w-full" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* II. Speed Testing */}
      <div className="mb-6">
        <h5 className="text-md font-semibold mb-3 text-sm md:text-base">II. Speed Testing</h5>
        <div className="overflow-x-auto"> {/* ✅ Responsive: Horizontal scroll for table */}
          <table className="table w-full border min-w-100"> {/* ✅ Responsive: Min width for table */}
            <thead>
              <tr>
                <th className="text-sm md:text-base">Speedometer Reading</th>
                <th className="text-sm md:text-base">Speed Tester Reading</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><input type="number" value={technicalData.speedTesting?.speedometer || ''} onChange={(e) => updateSpeedTesting('speedometer', e.target.value)} className="input input-bordered w-full" /></td>
                <td><input type="number" value={technicalData.speedTesting?.tester || ''} onChange={(e) => updateSpeedTesting('tester', e.target.value)} className="input input-bordered w-full" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* III. Turning Radius */}
      <div className="mb-6">
        <h5 className="text-md font-semibold mb-3 text-sm md:text-base">III. Turning Radius</h5>
        <div className="overflow-x-auto"> {/* ✅ Responsive: Horizontal scroll for table */}
          <table className="table w-full border min-w-100"> {/* ✅ Responsive: Min width for table */}
            <thead>
              <tr>
                <th className="text-sm md:text-base"></th>
                <th className="text-sm md:text-base">Inner Tire</th>
                <th className="text-sm md:text-base">Outer Tire</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="text-sm md:text-base">Left Hand</td>
                <td><input type="number" value={technicalData.turningRadius?.inner?.left || ''} onChange={(e) => updateTurningRadius('inner', 'left', e.target.value)} className="input input-bordered w-full" /></td>
                <td><input type="number" value={technicalData.turningRadius?.outer?.left || ''} onChange={(e) => updateTurningRadius('outer', 'left', e.target.value)} className="input input-bordered w-full" /></td>
              </tr>
              <tr>
                <td className="text-sm md:text-base">Right Hand</td>
                <td><input type="number" value={technicalData.turningRadius?.inner?.right || ''} onChange={(e) => updateTurningRadius('inner', 'right', e.target.value)} className="input input-bordered w-full" /></td>
                <td><input type="number" value={technicalData.turningRadius?.outer?.right || ''} onChange={(e) => updateTurningRadius('outer', 'right', e.target.value)} className="input input-bordered w-full" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* IV. Slip Tester */}
      <div className="mb-6">
        <h5 className="text-md font-semibold mb-3 text-sm md:text-base">IV. Slip Tester</h5>
        <div className="overflow-x-auto"> {/* ✅ Responsive: Horizontal scroll for table */}
          <table className="table w-full border min-w-100"> {/* ✅ Responsive: Min width for table */}
            <thead>
              <tr>
                <th className="text-sm md:text-base">Speed</th>
                <th className="text-sm md:text-base">Value</th>
                <th className="text-sm md:text-base">Actions</th>
              </tr>
            </thead>
            <tbody>
              {technicalData.slipTester?.map((slip, idx) => (
                <tr key={idx}>
                  <td><input type="text" value={slip.speed} onChange={(e) => updateSlipTester(idx, 'speed', e.target.value)} className="input input-bordered w-full" placeholder="e.g., 5kph" /></td>
                  <td><input type="number" value={slip.value} onChange={(e) => updateSlipTester(idx, 'value', e.target.value)} className="input input-bordered w-full" /></td>
                  <td><button className="btn btn-sm btn-error w-full md:w-auto" onClick={() => deleteSlipTester(idx)}>Delete</button></td> {/* ✅ Responsive: Full width on mobile */}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end mt-2"> {/* ✅ Responsive: Right-align button */}
          <button className="btn btn-sm btn-outline w-full md:w-auto" onClick={addSlipTester}>Add Slip Test</button> {/* ✅ Responsive: Full width on mobile */}
        </div>
      </div>

      {/* V. Headlight Tester */}
      <div className="mb-6">
        <h5 className="text-md font-semibold mb-3 text-sm md:text-base">V. Headlight Tester</h5>
        <div className="overflow-x-auto"> {/* ✅ Responsive: Horizontal scroll for table */}
          <table className="table w-full border min-w-150"> {/* ✅ Responsive: Min width for table */}
            <thead>
              <tr>
                <th className="text-sm md:text-base"></th>
                <th colSpan="2" className="text-center text-sm md:text-base">Low Beam</th>
                <th colSpan="2" className="text-center text-sm md:text-base">High Beam</th>
              </tr>
              <tr>
                <th className="text-sm md:text-base"></th>
                <th className="text-sm md:text-base">Before Adjustment</th>
                <th className="text-sm md:text-base">After Adjustment</th>
                <th className="text-sm md:text-base">Before Adjustment</th>
                <th className="text-sm md:text-base">After Adjustment</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="text-sm md:text-base">Left Hand</td>
                <td><input type="number" value={technicalData.headlightTester?.lowBeam?.before?.left || ''} onChange={(e) => updateHeadlightTester('lowBeam', 'before', 'left', e.target.value)} className="input input-bordered w-full" /></td>
                <td><input type="number" value={technicalData.headlightTester?.lowBeam?.after?.left || ''} onChange={(e) => updateHeadlightTester('lowBeam', 'after', 'left', e.target.value)} className="input input-bordered w-full" /></td>
                                <td><input type="number" value={technicalData.headlightTester?.highBeam?.before?.left || ''} onChange={(e) => updateHeadlightTester('highBeam', 'before', 'left', e.target.value)} className="input input-bordered w-full" /></td>
                <td><input type="number" value={technicalData.headlightTester?.highBeam?.after?.left || ''} onChange={(e) => updateHeadlightTester('highBeam', 'after', 'left', e.target.value)} className="input input-bordered w-full" /></td>
              </tr>
              <tr>
                <td className="text-sm md:text-base">Right Hand</td>
                <td><input type="number" value={technicalData.headlightTester?.lowBeam?.before?.right || ''} onChange={(e) => updateHeadlightTester('lowBeam', 'before', 'right', e.target.value)} className="input input-bordered w-full" /></td>
                <td><input type="number" value={technicalData.headlightTester?.lowBeam?.after?.right || ''} onChange={(e) => updateHeadlightTester('lowBeam', 'after', 'right', e.target.value)} className="input input-bordered w-full" /></td>
                <td><input type="number" value={technicalData.headlightTester?.highBeam?.before?.right || ''} onChange={(e) => updateHeadlightTester('highBeam', 'before', 'right', e.target.value)} className="input input-bordered w-full" /></td>
                <td><input type="number" value={technicalData.headlightTester?.highBeam?.after?.right || ''} onChange={(e) => updateHeadlightTester('highBeam', 'after', 'right', e.target.value)} className="input input-bordered w-full" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* VI. ABS Testing */}
      <div className="mb-6">
        <h5 className="text-md font-semibold mb-3 text-sm md:text-base">VI. ABS Testing (if equipped)</h5>
        <div className="overflow-x-auto"> {/* ✅ Responsive: Horizontal scroll for table */}
          <table className="table w-full border min-w-100"> {/* ✅ Responsive: Min width for table */}
            <thead>
              <tr>
                <th className="text-sm md:text-base">Option</th>
                <th className="text-sm md:text-base">Remarks</th>
                <th className="text-sm md:text-base">Actions</th>
              </tr>
            </thead>
            <tbody>
              {technicalData.absTesting?.map((abs, idx) => (
                <tr key={idx}>
                  <td><input type="text" value={abs.option} onChange={(e) => updateAbsTesting(idx, 'option', e.target.value)} className="input input-bordered w-full" placeholder="e.g., a. Relay sound/Electric" /></td>
                  <td><input type="text" value={abs.remarks} onChange={(e) => updateAbsTesting(idx, 'remarks', e.target.value)} className="input input-bordered w-full" /></td>
                  <td><button className="btn btn-sm btn-error w-full md:w-auto" onClick={() => deleteAbsTesting(idx)}>Delete</button></td> {/* ✅ Responsive: Full width on mobile */}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end mt-2"> {/* ✅ Responsive: Right-align button */}
          <button className="btn btn-sm btn-outline w-full md:w-auto" onClick={addAbsTesting}>Add ABS Test</button> {/* ✅ Responsive: Full width on mobile */}
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-end mt-4 space-y-2 md:space-y-0 md:space-x-2"> {/* ✅ Responsive: Stack buttons */}
        <button className="btn btn-success w-full md:w-auto" onClick={() => onSave(technicalData)}>Save Technical Checklist</button> {/* ✅ Responsive: Full width on mobile */}
      </div>
    </div>
  );
};

export default TechnicalChecklist;