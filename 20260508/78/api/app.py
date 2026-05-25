"""
大气扩散模型模拟系统 - Flask后端应用
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, request, jsonify
from flask_cors import CORS

from models.stability import STABILITY_CLASSES
from services.calculator import DiffusionCalculator
from services.contour import ContourGenerator

app = Flask(__name__)
CORS(app)

calculator = DiffusionCalculator()
contour_generator = ContourGenerator()

DEFAULT_PARAMS = {
    "source": {
        "longitude": 116.3975,
        "latitude": 39.9087,
        "emissionRate": 100,
        "stackHeight": 100,
        "stackRadius": 2,
        "exitVelocity": 15,
        "exitTemperature": 393.15
    },
    "meteorology": {
        "windSpeed": 5,
        "windDirection": 180,
        "stabilityClass": "B",
        "mixingHeight": 1000,
        "ambientTemperature": 293.15
    },
    "domain": {
        "gridSize": 50,
        "domainWidth": 2000,
        "domainHeight": 2000,
        "downwindDistance": 5000
    }
}


@app.route("/api/health", methods=["GET"])
def health_check():
    """健康检查"""
    return jsonify({"status": "ok", "message": "大气扩散模型服务运行中"})


@app.route("/api/default-params", methods=["GET"])
def get_default_params():
    """获取默认参数"""
    return jsonify(DEFAULT_PARAMS)


@app.route("/api/stability-classes", methods=["GET"])
def get_stability_classes():
    """获取大气稳定度分类参数"""
    return jsonify(STABILITY_CLASSES)


@app.route("/api/calculate", methods=["POST"])
def calculate():
    """
    计算污染物浓度分布
    
    请求体:
        source: 污染源参数
        meteorology: 气象参数
        domain: 计算域参数
        modelType: 模型类型 ('gaussian' 或 'calpuff')
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "缺少请求数据"}), 400
        
        model_type = data.get("modelType", "gaussian")
        
        if model_type == "gaussian":
            result = calculator.calculate(data)
            
            X, Y, C = contour_generator.generate_heatmap_data(result["grid"])
            contour_data = contour_generator.generate_contours(X, Y, C)
            result["contourData"] = contour_data
            
            return jsonify(result)
            
        elif model_type == "calpuff":
            from models.calpuff import calculate_with_calpuff
            calpuff_result = calculate_with_calpuff(data)
            
            if calpuff_result is None:
                return jsonify({
                    "error": "CALPUFF模型不可用，请确保已安装并配置路径"
                }), 501
            
            return jsonify(calpuff_result)
            
        else:
            return jsonify({"error": f"未知的模型类型: {model_type}"}), 400
            
    except Exception as e:
        app.logger.error(f"计算错误: {str(e)}")
        return jsonify({"error": f"计算错误: {str(e)}"}), 500


@app.route("/api/calculate-plume", methods=["POST"])
def calculate_plume():
    """仅计算下风向轴线浓度"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "缺少请求数据"}), 400
        
        if "domain" not in data:
            data["domain"] = {
                "gridSize": 50,
                "domainWidth": 2000,
                "domainHeight": 2000,
                "downwindDistance": data.get("maxDistance", 5000)
            }
        
        result = calculator.calculate(data)
        
        return jsonify({
            "plumeLine": result["plumeLine"],
            "effectiveHeight": result["effectiveHeight"],
            "plumeRise": result["plumeRise"],
            "statistics": result["statistics"]
        })
        
    except Exception as e:
        app.logger.error(f"计算错误: {str(e)}")
        return jsonify({"error": f"计算错误: {str(e)}"}), 500


if __name__ == "__main__":
    print("=" * 60)
    print("大气扩散模型模拟系统 - 后端服务")
    print("=" * 60)
    print("服务地址: http://localhost:5000")
    print("API文档:")
    print("  GET  /api/health           - 健康检查")
    print("  GET  /api/default-params   - 获取默认参数")
    print("  GET  /api/stability-classes - 获取稳定度分类")
    print("  POST /api/calculate        - 计算浓度分布")
    print("  POST /api/calculate-plume  - 计算轴线浓度")
    print("=" * 60)
    
    app.run(host="0.0.0.0", port=5000, debug=True)
