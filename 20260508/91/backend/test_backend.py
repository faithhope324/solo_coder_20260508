"""
后端功能测试脚本
测试量子电路模拟器核心功能
"""
import sys
import json

from quantum_simulator import run_circuit, get_bloch_coordinates


def test_bell_state():
    print("=" * 60)
    print("测试 1: 创建 Bell 态 |Φ+⟩ = (|00⟩ + |11⟩)/√2")
    print("=" * 60)

    circuit = {
        "name": "Bell State",
        "num_qubits": 2,
        "num_clbits": 2,
        "gates": [
            {"type": "H", "targets": [0], "controls": []},
            {"type": "CNOT", "targets": [1], "controls": [0]},
        ],
    }

    result = run_circuit(circuit, shots=10000)
    sv = [complex(c[0], c[1]) for c in result['statevector']]
    print(f"状态向量: {sv}")
    print(f"概率分布: {result['probabilities']}")
    print(f"计数: {result['counts']}")

    p00 = result['probabilities'].get('00', 0)
    p11 = result['probabilities'].get('11', 0)
    p01 = result['probabilities'].get('01', 0)
    p10 = result['probabilities'].get('10', 0)

    assert p00 > 0.45 and p11 > 0.45, f"Bell 态概率异常: P(00)={p00}, P(11)={p11}"
    assert p01 < 0.1 and p10 < 0.1, f"Bell 态概率异常: P(01)={p01}, P(10)={p10}"

    print("✓ Bell 态测试通过!")
    return True


def test_ghz_state():
    print("\n" + "=" * 60)
    print("测试 2: 创建 GHZ 态 (|000⟩ + |111⟩)/√2")
    print("=" * 60)

    circuit = {
        "name": "GHZ State",
        "num_qubits": 3,
        "num_clbits": 3,
        "gates": [
            {"type": "H", "targets": [0], "controls": []},
            {"type": "CNOT", "targets": [1], "controls": [0]},
            {"type": "CNOT", "targets": [2], "controls": [1]},
        ],
    }

    result = run_circuit(circuit, shots=10000)
    sv = [complex(c[0], c[1]) for c in result['statevector']]
    print(f"状态向量: {sv}")
    print(f"概率分布: {result['probabilities']}")
    print(f"计数: {result['counts']}")

    p000 = result['probabilities'].get('000', 0)
    p111 = result['probabilities'].get('111', 0)

    assert p000 > 0.45 and p111 > 0.45, f"GHZ 态概率异常: P(000)={p000}, P(111)={p111}"

    print("✓ GHZ 态测试通过!")
    return True


def test_bloch_sphere():
    print("\n" + "=" * 60)
    print("测试 3: Bloch 球坐标计算")
    print("=" * 60)

    state_zero = [[1, 0], [0, 0]]
    coords_zero = get_bloch_coordinates(state_zero)
    print(f"|0⟩ 态坐标: {coords_zero}")
    assert abs(coords_zero['x']) < 0.01 and abs(coords_zero['y']) < 0.01 and abs(coords_zero['z'] - 1) < 0.01

    state_one = [[0, 0], [1, 0]]
    coords_one = get_bloch_coordinates(state_one)
    print(f"|1⟩ 态坐标: {coords_one}")
    assert abs(coords_one['x']) < 0.01 and abs(coords_one['y']) < 0.01 and abs(coords_one['z'] + 1) < 0.01

    state_plus = [[0.707, 0], [0.707, 0]]
    coords_plus = get_bloch_coordinates(state_plus)
    print(f"|+⟩ 态坐标: {coords_plus}")
    assert abs(coords_plus['x'] - 1) < 0.05

    print("✓ Bloch 球坐标测试通过!")
    return True


def test_storage():
    print("\n" + "=" * 60)
    print("测试 4: 电路存储功能")
    print("=" * 60)

    from storage import save_circuit, load_circuit, list_circuits, delete_circuit

    test_circuit = {
        "name": "测试电路",
        "num_qubits": 2,
        "num_clbits": 2,
        "gates": [
            {"type": "H", "targets": [0], "controls": []},
        ],
    }

    circuit_id = save_circuit(test_circuit)
    print(f"保存电路 ID: {circuit_id}")

    loaded = load_circuit(circuit_id)
    assert loaded is not None, "加载电路失败"
    assert loaded["name"] == "测试电路", "电路名称不匹配"
    print(f"加载电路: {loaded['name']}")

    circuits = list_circuits()
    print(f"已保存电路列表: {len(circuits)} 个")

    deleted = delete_circuit(circuit_id)
    assert deleted, "删除电路失败"
    print(f"删除电路: {circuit_id}")

    print("✓ 电路存储测试通过!")
    return True


if __name__ == "__main__":
    print("🧪 量子电路模拟器 - 后端功能测试")
    print()

    results = []

    try:
        results.append(("Bell 态", test_bell_state()))
    except Exception as e:
        print(f"✗ Bell 态测试失败: {e}")
        results.append(("Bell 态", False))

    try:
        results.append(("GHZ 态", test_ghz_state()))
    except Exception as e:
        print(f"✗ GHZ 态测试失败: {e}")
        results.append(("GHZ 态", False))

    try:
        results.append(("Bloch 球坐标", test_bloch_sphere()))
    except Exception as e:
        print(f"✗ Bloch 球坐标测试失败: {e}")
        results.append(("Bloch 球坐标", False))

    try:
        results.append(("电路存储", test_storage()))
    except Exception as e:
        print(f"✗ 电路存储测试失败: {e}")
        results.append(("电路存储", False))

    print("\n" + "=" * 60)
    print("测试结果汇总:")
    print("=" * 60)
    for name, passed in results:
        status = "✓ 通过" if passed else "✗ 失败"
        print(f"  {name}: {status}")

    all_passed = all(r[1] for r in results)
    if all_passed:
        print("\n🎉 所有测试通过!")
        sys.exit(0)
    else:
        print("\n⚠️ 部分测试失败，请检查上述错误信息")
        sys.exit(1)