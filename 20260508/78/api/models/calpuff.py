"""
CALPUFF 模型接口
预留接口，可调用外部CALPUFF可执行文件
"""

import subprocess
import os
import tempfile
from typing import Optional


class CALPUFFInterface:
    """
    CALPUFF模型调用接口
    
    注意: 需要用户自行安装CALPUFF模型并设置路径
    CALPUFF是美国EPA开发的非稳态扩散模型
    """
    
    def __init__(self, calpuff_path: Optional[str] = None):
        self.calpuff_path = calpuff_path or os.environ.get("CALPUFF_PATH")
    
    def is_available(self) -> bool:
        """检查CALPUFF是否可用"""
        if not self.calpuff_path:
            return False
        return os.path.exists(self.calpuff_path)
    
    def generate_input_file(self, params: dict, temp_dir: str) -> str:
        """生成CALPUFF输入文件"""
        input_path = os.path.join(temp_dir, "calpuff.inp")
        
        with open(input_path, "w") as f:
            f.write("! CALPUFF 输入文件 (自动生成)\n")
            f.write(f"SOURCENAME  EMISSION_SOURCE\n")
            f.write(f"SRCTYPE POINT {params['source']['latitude']} {params['source']['longitude']} {params['source']['stackHeight']}\n")
            f.write(f"EMISRATE {params['source']['emissionRate']}\n")
            f.write(f"STACKDIA {params['source']['stackRadius'] * 2}\n")
            f.write(f"STACKVEL {params['source']['exitVelocity']}\n")
            f.write(f"STACKTEMP {params['source']['exitTemperature']}\n")
            f.write(f"WINDDIR {params['meteorology']['windDirection']}\n")
            f.write(f"WINDSPD {params['meteorology']['windSpeed']}\n")
            f.write(f"STABILITY {params['meteorology']['stabilityClass']}\n")
            f.write(f"MIXHGT {params['meteorology']['mixingHeight']}\n")
        
        return input_path
    
    def run(self, params: dict) -> Optional[dict]:
        """
        运行CALPUFF模型
        
        注意: 这是一个示例接口，实际使用时需要根据CALPUFF文档
        的具体输入输出格式进行调整
        """
        if not self.is_available():
            return None
        
        try:
            with tempfile.TemporaryDirectory() as temp_dir:
                input_file = self.generate_input_file(params, temp_dir)
                
                result = subprocess.run(
                    [self.calpuff_path, input_file],
                    cwd=temp_dir,
                    capture_output=True,
                    text=True,
                    timeout=300
                )
                
                if result.returncode == 0:
                    return {"status": "success", "output": result.stdout}
                else:
                    return {"status": "error", "stderr": result.stderr}
                    
        except Exception as e:
            return {"status": "error", "message": str(e)}


def calculate_with_calpuff(params: dict) -> Optional[dict]:
    """使用CALPUFF模型计算（可选接口"""
    interface = CALPUFFInterface()
    return interface.run(params)
