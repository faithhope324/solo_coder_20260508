"""
量子电路模拟器核心模块
使用 Qiskit 运行量子电路，返回状态向量和测量概率分布
"""
import numpy as np
from qiskit import QuantumCircuit
from qiskit_aer import AerSimulator


GATE_TYPES = {
    "H": "hadamard",
    "X": "pauli_x",
    "Y": "pauli_y",
    "Z": "pauli_z",
    "CNOT": "cnot",
    "CX": "cnot",
    "T": "t_gate",
    "TDG": "t_dag",
    "S": "s_gate",
    "SDG": "s_dag",
}


def build_circuit_from_json(circuit_data: dict) -> QuantumCircuit:
    num_qubits = circuit_data.get("num_qubits", 2)
    num_clbits = circuit_data.get("num_clbits", num_qubits)
    qc = QuantumCircuit(num_qubits, num_clbits)

    for gate in circuit_data.get("gates", []):
        gate_type = gate.get("type", "").upper()
        targets = gate.get("targets", [])
        controls = gate.get("controls", [])

        if gate_type in ("H", "HADAMARD"):
            for t in targets:
                qc.h(t)
        elif gate_type in ("X", "PAULI_X"):
            for t in targets:
                qc.x(t)
        elif gate_type in ("Y", "PAULI_Y"):
            for t in targets:
                qc.y(t)
        elif gate_type in ("Z", "PAULI_Z"):
            for t in targets:
                qc.z(t)
        elif gate_type in ("CNOT", "CX"):
            for c in controls:
                for t in targets:
                    qc.cx(c, t)
        elif gate_type in ("T", "T_GATE"):
            for t in targets:
                qc.t(t)
        elif gate_type in ("TDG", "T_DAG"):
            for t in targets:
                qc.tdg(t)
        elif gate_type in ("S", "S_GATE"):
            for t in targets:
                qc.s(t)
        elif gate_type in ("SDG", "S_DAG"):
            for t in targets:
                qc.sdg(t)
        elif gate_type == "MEASURE":
            for t in targets:
                qc.measure(t, t)

    if not any(g.get("type", "").upper() == "MEASURE" for g in circuit_data.get("gates", [])):
        qc.measure_all()

    return qc


def run_circuit(circuit_data: dict, shots: int = 1024) -> dict:
    qc = build_circuit_from_json(circuit_data)

    sim = AerSimulator()

    qc_state = qc.copy()
    if qc_state.num_clbits > 0:
        qc_state.remove_final_measurements()
    qc_state.save_statevector()

    result = sim.run(qc_state, shots=1).result()
    statevector = result.data(0)["statevector"]
    sv_array = np.asarray(statevector)
    statevector_data = [[float(c.real), float(c.imag)] for c in sv_array]

    result_counts = sim.run(qc, shots=shots).result()
    counts = result_counts.get_counts()

    num_qubits = circuit_data.get("num_qubits", 2)
    probabilities = {}
    for outcome in range(2 ** num_qubits):
        key = format(outcome, f"0{num_qubits}b")
        prob = counts.get(key, 0)
        if prob == 0:
            for c_key, c_val in counts.items():
                if c_key.startswith(key + " "):
                    prob += c_val
        probabilities[key] = prob / shots

    return {
        "statevector": statevector_data,
        "probabilities": probabilities,
        "counts": dict(counts),
        "num_qubits": num_qubits,
    }


def get_bloch_coordinates(statevector: list) -> dict:
    sv = np.array([complex(c[0], c[1]) for c in statevector], dtype=complex)
    if len(sv) != 2:
        return None

    alpha = sv[0]
    beta = sv[1]

    norm = np.sqrt(np.abs(alpha) ** 2 + np.abs(beta) ** 2)
    if norm < 1e-10:
        return {"x": 0, "y": 0, "z": 1}

    alpha_norm = alpha / norm
    beta_norm = beta / norm

    phase_alpha = np.angle(alpha_norm)
    a = alpha_norm * np.exp(-1j * phase_alpha)
    b = beta_norm * np.exp(-1j * phase_alpha)

    theta = 2 * np.arccos(np.clip(np.abs(a), 0, 1))
    phi = float(np.angle(b)) if np.abs(b) > 1e-10 else 0.0

    x = float(np.sin(theta) * np.cos(phi))
    y = float(np.sin(theta) * np.sin(phi))
    z = float(np.cos(theta))

    return {"x": x, "y": y, "z": z}


def get_single_qubit_bloch(statevector: list, target_qubit: int, total_qubits: int) -> dict:
    sv = np.array([complex(c[0], c[1]) for c in statevector], dtype=complex)
    rho = np.outer(sv, np.conj(sv))

    rho_red = np.zeros((2, 2), dtype=complex)

    for i in range(2 ** total_qubits):
        for j in range(2 ** total_qubits):
            i_str = format(i, f"0{total_qubits}b")
            j_str = format(j, f"0{total_qubits}b")

            other_i = i_str[:target_qubit] + i_str[target_qubit+1:]
            other_j = j_str[:target_qubit] + j_str[target_qubit+1:]

            if other_i == other_j:
                a = int(i_str[target_qubit])
                b = int(j_str[target_qubit])
                rho_red[a, b] += rho[i, j]

    trace = np.trace(rho_red)
    if trace > 1e-10:
        rho_red = rho_red / trace

    x = float(2 * np.real(rho_red[0, 1]))
    y = float(2 * np.imag(rho_red[1, 0]))
    z = float(np.real(rho_red[0, 0] - rho_red[1, 1]))

    max_val = max(abs(x), abs(y), abs(z), 1e-10)
    if max_val > 1:
        x /= max_val
        y /= max_val
        z /= max_val

    return {"x": x, "y": y, "z": z}


def get_all_qubit_bloch_coords(statevector: list, num_qubits: int) -> list:
    results = []
    for i in range(num_qubits):
        coords = get_single_qubit_bloch(statevector, i, num_qubits)
        results.append({"qubit": i, **coords})
    return results