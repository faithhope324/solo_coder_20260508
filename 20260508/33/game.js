// 游戏常量配置
const GAME_CONFIG = {
  GAME_DURATION: 60,
  CANVAS_WIDTH: 600,
  CANVAS_HEIGHT: 600,
  ROAD_WIDTH: 100,
  VEHICLE_WIDTH: 40,
  VEHICLE_HEIGHT: 60,
  VEHICLE_SPEED: 2.5,
  INITIAL_SPAWN_INTERVAL: 2500,
  MIN_SPAWN_INTERVAL: 800,
  STOP_LINE_OFFSET: 80,
};

// 方向类型
const DIRECTIONS = ['north', 'south', 'east', 'west'];
const LIGHT_COLORS = ['red', 'yellow', 'green'];

// 车辆颜色
const VEHICLE_COLORS = [
  '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4',
  '#ffeaa7', '#dfe6e9', '#fd79a8', '#a29bfe',
  '#00b894', '#e17055', '#74b9ff', '#fab1a0'
];

// ==================== 游戏状态管理 ====================
class GameState {
  constructor() {
    this.reset();
  }

  reset() {
    this.isPlaying = false;
    this.isGameOver = false;
    this.score = 0;
    this.timeLeft = GAME_CONFIG.GAME_DURATION;
    this.vehicles = [];
    this.trafficLights = {
      north: 'red',
      south: 'red',
      east: 'green',
      west: 'green'
    };
    this.lastSpawnTime = 0;
    this.spawnInterval = GAME_CONFIG.INITIAL_SPAWN_INTERVAL;
    this.vehicleIdCounter = 0;
  }
}

const gameState = new GameState();

// ==================== 信号灯逻辑模块 ====================
class TrafficLightController {
  constructor() {
    this.lightElements = {
      north: document.querySelector('.traffic-light.north'),
      south: document.querySelector('.traffic-light.south'),
      east: document.querySelector('.traffic-light.east'),
      west: document.querySelector('.traffic-light.west')
    };
    this.bindEvents();
    this.updateAllLights();
  }

  bindEvents() {
    Object.entries(this.lightElements).forEach(([direction, element]) => {
      element.addEventListener('click', () => this.cycleLight(direction));
    });
  }

  cycleLight(direction) {
    if (!gameState.isPlaying) return;
    
    const isVertical = direction === 'north' || direction === 'south';
    const currentColor = isVertical ? gameState.trafficLights.north : gameState.trafficLights.east;
    
    if (currentColor === 'yellow') return;
    
    if (currentColor === 'red') {
      if (isVertical) {
        ['north', 'south'].forEach(dir => {
          gameState.trafficLights[dir] = 'green';
          this.updateLight(dir);
        });
      } else {
        ['east', 'west'].forEach(dir => {
          gameState.trafficLights[dir] = 'green';
          this.updateLight(dir);
        });
      }
    } else if (currentColor === 'green') {
      if (isVertical) {
        ['north', 'south'].forEach(dir => {
          gameState.trafficLights[dir] = 'yellow';
          this.updateLight(dir);
        });
        setTimeout(() => {
          ['north', 'south'].forEach(dir => {
            if (gameState.trafficLights[dir] === 'yellow') {
              gameState.trafficLights[dir] = 'red';
              this.updateLight(dir);
            }
          });
        }, 1500);
      } else {
        ['east', 'west'].forEach(dir => {
          gameState.trafficLights[dir] = 'yellow';
          this.updateLight(dir);
        });
        setTimeout(() => {
          ['east', 'west'].forEach(dir => {
            if (gameState.trafficLights[dir] === 'yellow') {
              gameState.trafficLights[dir] = 'red';
              this.updateLight(dir);
            }
          });
        }, 1500);
      }
    }
  }

  updateLight(direction) {
    const element = this.lightElements[direction];
    const color = gameState.trafficLights[direction];
    
    element.querySelectorAll('.light').forEach(light => {
      light.classList.remove('active');
    });
    
    element.querySelector(`.light.${color}`).classList.add('active');
  }

  updateAllLights() {
    DIRECTIONS.forEach(dir => this.updateLight(dir));
  }
}

// ==================== 车辆生成器模块 ====================
class VehicleGenerator {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
  }

  generateVehicle() {
    const direction = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
    const color = VEHICLE_COLORS[Math.floor(Math.random() * VEHICLE_COLORS.length)];
    
    let x, y, width, height;
    const centerX = GAME_CONFIG.CANVAS_WIDTH / 2;
    const centerY = GAME_CONFIG.CANVAS_HEIGHT / 2;
    const halfRoad = GAME_CONFIG.ROAD_WIDTH / 2;

    const isHorizontal = direction === 'east' || direction === 'west';
    if (isHorizontal) {
      width = GAME_CONFIG.VEHICLE_HEIGHT;
      height = GAME_CONFIG.VEHICLE_WIDTH;
    } else {
      width = GAME_CONFIG.VEHICLE_WIDTH;
      height = GAME_CONFIG.VEHICLE_HEIGHT;
    }

    switch (direction) {
      case 'north':
        x = centerX + 10 + Math.random() * (halfRoad - 30);
        y = GAME_CONFIG.CANVAS_HEIGHT + 50;
        break;
      case 'south':
        x = centerX - halfRoad + 10 + Math.random() * (halfRoad - 30);
        y = -50 - height;
        break;
      case 'east':
        x = -50 - width;
        y = centerY + 10 + Math.random() * (halfRoad - 30);
        break;
      case 'west':
        x = GAME_CONFIG.CANVAS_WIDTH + 50;
        y = centerY - halfRoad + 10 + Math.random() * (halfRoad - 30);
        break;
    }

    return {
      id: ++gameState.vehicleIdCounter,
      direction,
      x,
      y,
      speed: GAME_CONFIG.VEHICLE_SPEED + Math.random() * 1,
      color,
      width,
      height,
      hasPassed: false,
      isStopped: false
    };
  }

  shouldSpawn(currentTime) {
    if (currentTime - gameState.lastSpawnTime >= gameState.spawnInterval) {
      gameState.lastSpawnTime = currentTime;
      this.decreaseSpawnInterval();
      return true;
    }
    return false;
  }

  decreaseSpawnInterval() {
    gameState.spawnInterval = Math.max(
      GAME_CONFIG.MIN_SPAWN_INTERVAL,
      gameState.spawnInterval - 50
    );
  }

  trySpawn(currentTime) {
    if (this.shouldSpawn(currentTime)) {
      gameState.vehicles.push(this.generateVehicle());
    }
  }
}

// ==================== 碰撞检测模块 ====================
class CollisionDetector {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.centerX = GAME_CONFIG.CANVAS_WIDTH / 2;
    this.centerY = GAME_CONFIG.CANVAS_HEIGHT / 2;
    this.halfRoad = GAME_CONFIG.ROAD_WIDTH / 2;
  }

  isInIntersection(vehicle) {
    const inXRange = vehicle.x + vehicle.width > this.centerX - this.halfRoad &&
                     vehicle.x < this.centerX + this.halfRoad;
    const inYRange = vehicle.y + vehicle.height > this.centerY - this.halfRoad &&
                     vehicle.y < this.centerY + this.halfRoad;
    return inXRange && inYRange;
  }

  shouldStop(vehicle) {
    const lightColor = gameState.trafficLights[vehicle.direction];
    if (lightColor === 'green') return false;
    if (this.isInIntersection(vehicle)) return false;

    let stopLineX, stopLineY;
    switch (vehicle.direction) {
      case 'north':
        stopLineY = this.centerY + this.halfRoad - GAME_CONFIG.STOP_LINE_OFFSET;
        return vehicle.y > stopLineY && vehicle.y < this.centerY + this.halfRoad;
      case 'south':
        stopLineY = this.centerY - this.halfRoad + GAME_CONFIG.STOP_LINE_OFFSET;
        return vehicle.y < stopLineY && vehicle.y + vehicle.height > this.centerY - this.halfRoad;
      case 'east':
        stopLineX = this.centerX - this.halfRoad + GAME_CONFIG.STOP_LINE_OFFSET;
        return vehicle.x < stopLineX && vehicle.x + vehicle.width > this.centerX - this.halfRoad;
      case 'west':
        stopLineX = this.centerX + this.halfRoad - GAME_CONFIG.STOP_LINE_OFFSET;
        return vehicle.x > stopLineX && vehicle.x < this.centerX + this.halfRoad;
    }
    return false;
  }

  checkVehicleCollision(v1, v2) {
    return v1.x < v2.x + v2.width &&
           v1.x + v1.width > v2.x &&
           v1.y < v2.y + v2.height &&
           v1.y + v1.height > v2.y;
  }

  checkAllCollisions() {
    const vehicles = gameState.vehicles;
    
    for (let i = 0; i < vehicles.length; i++) {
      for (let j = i + 1; j < vehicles.length; j++) {
        if (this.checkVehicleCollision(vehicles[i], vehicles[j])) {
          if (this.isInIntersection(vehicles[i]) || this.isInIntersection(vehicles[j])) {
            return true;
          }
        }
      }
    }
    return false;
  }

  checkRedLightViolation(vehicle) {
    const lightColor = gameState.trafficLights[vehicle.direction];
    if (lightColor !== 'red') return false;
    
    return this.isInIntersection(vehicle) && !vehicle.hasPassed;
  }
}

// ==================== 计分模块 ====================
class ScoreManager {
  constructor() {
    this.scoreElement = document.getElementById('score');
    this.timerElement = document.getElementById('timer');
    this.statusElement = document.getElementById('status');
    this.lastTimeUpdate = 0;
  }

  updateScore() {
    this.scoreElement.textContent = gameState.score;
  }

  incrementScore() {
    gameState.score++;
    this.updateScore();
  }

  updateTimer(currentTime) {
    if (currentTime - this.lastTimeUpdate >= 1000) {
      this.lastTimeUpdate = currentTime;
      gameState.timeLeft--;
      this.timerElement.textContent = gameState.timeLeft;
      
      if (gameState.timeLeft <= 10) {
        this.timerElement.style.color = '#ff4757';
      }
    }
  }

  updateStatus(text) {
    this.statusElement.textContent = text;
  }

  reset() {
    this.updateScore();
    this.timerElement.textContent = gameState.timeLeft;
    this.timerElement.style.color = '#fff';
    this.updateStatus('准备中');
  }
}

// ==================== 车辆移动和渲染 ====================
class VehicleController {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.collisionDetector = new CollisionDetector();
    this.scoreManager = new ScoreManager();
  }

  updateVehicles() {
    const vehiclesToRemove = [];

    gameState.vehicles.forEach((vehicle, index) => {
      if (this.collisionDetector.shouldStop(vehicle) && !vehicle.hasPassed) {
        vehicle.isStopped = true;
      } else {
        vehicle.isStopped = false;
      }

      if (!vehicle.isStopped) {
        switch (vehicle.direction) {
          case 'north':
            vehicle.y -= vehicle.speed;
            break;
          case 'south':
            vehicle.y += vehicle.speed;
            break;
          case 'east':
            vehicle.x += vehicle.speed;
            break;
          case 'west':
            vehicle.x -= vehicle.speed;
            break;
        }
      }

      if (!vehicle.hasPassed && this.hasPassedIntersection(vehicle)) {
        vehicle.hasPassed = true;
        this.scoreManager.incrementScore();
      }

      if (this.isOutOfBounds(vehicle)) {
        vehiclesToRemove.push(index);
      }
    });

    vehiclesToRemove.reverse().forEach(index => {
      gameState.vehicles.splice(index, 1);
    });
  }

  hasPassedIntersection(vehicle) {
    const centerX = GAME_CONFIG.CANVAS_WIDTH / 2;
    const centerY = GAME_CONFIG.CANVAS_HEIGHT / 2;
    const halfRoad = GAME_CONFIG.ROAD_WIDTH / 2;

    switch (vehicle.direction) {
      case 'north':
        return vehicle.y + vehicle.height < centerY - halfRoad;
      case 'south':
        return vehicle.y > centerY + halfRoad;
      case 'east':
        return vehicle.x > centerX + halfRoad;
      case 'west':
        return vehicle.x + vehicle.width < centerX - halfRoad;
    }
    return false;
  }

  isOutOfBounds(vehicle) {
    const margin = 100;
    return vehicle.x + vehicle.width < -margin || 
           vehicle.x > GAME_CONFIG.CANVAS_WIDTH + margin ||
           vehicle.y + vehicle.height < -margin || 
           vehicle.y > GAME_CONFIG.CANVAS_HEIGHT + margin;
  }

  drawVehicles() {
    gameState.vehicles.forEach(vehicle => {
      this.ctx.save();
      
      this.ctx.fillStyle = vehicle.color;
      this.ctx.beginPath();
      this.roundRect(
        vehicle.x, 
        vehicle.y, 
        vehicle.width, 
        vehicle.height, 
        6
      );
      this.ctx.fill();

      const isHorizontal = vehicle.direction === 'east' || vehicle.direction === 'west';
      
      if (isHorizontal) {
        this.ctx.fillStyle = '#2d3436';
        this.ctx.fillRect(vehicle.x + 8, vehicle.y + 5, 18, vehicle.height - 10);
        this.ctx.fillRect(vehicle.x + vehicle.width - 20, vehicle.y + 5, 12, vehicle.height - 10);

        if (!vehicle.isStopped) {
          this.ctx.fillStyle = '#ffeaa7';
          if (vehicle.direction === 'east') {
            this.ctx.beginPath();
            this.ctx.arc(vehicle.x + vehicle.width - 4, vehicle.y + 8, 3, 0, Math.PI * 2);
            this.ctx.arc(vehicle.x + vehicle.width - 4, vehicle.y + vehicle.height - 8, 3, 0, Math.PI * 2);
            this.ctx.fill();
          } else {
            this.ctx.beginPath();
            this.ctx.arc(vehicle.x + 4, vehicle.y + 8, 3, 0, Math.PI * 2);
            this.ctx.arc(vehicle.x + 4, vehicle.y + vehicle.height - 8, 3, 0, Math.PI * 2);
            this.ctx.fill();
          }
        } else {
          this.ctx.fillStyle = '#ff4757';
          if (vehicle.direction === 'east') {
            this.ctx.beginPath();
            this.ctx.arc(vehicle.x + 4, vehicle.y + 8, 3, 0, Math.PI * 2);
            this.ctx.arc(vehicle.x + 4, vehicle.y + vehicle.height - 8, 3, 0, Math.PI * 2);
            this.ctx.fill();
          } else {
            this.ctx.beginPath();
            this.ctx.arc(vehicle.x + vehicle.width - 4, vehicle.y + 8, 3, 0, Math.PI * 2);
            this.ctx.arc(vehicle.x + vehicle.width - 4, vehicle.y + vehicle.height - 8, 3, 0, Math.PI * 2);
            this.ctx.fill();
          }
        }
      } else {
        this.ctx.fillStyle = '#2d3436';
        this.ctx.fillRect(vehicle.x + 5, vehicle.y + 8, vehicle.width - 10, 18);
        this.ctx.fillRect(vehicle.x + 5, vehicle.y + vehicle.height - 20, vehicle.width - 10, 12);

        if (!vehicle.isStopped) {
          this.ctx.fillStyle = '#ffeaa7';
          if (vehicle.direction === 'north') {
            this.ctx.beginPath();
            this.ctx.arc(vehicle.x + 8, vehicle.y + 4, 3, 0, Math.PI * 2);
            this.ctx.arc(vehicle.x + vehicle.width - 8, vehicle.y + 4, 3, 0, Math.PI * 2);
            this.ctx.fill();
          } else {
            this.ctx.beginPath();
            this.ctx.arc(vehicle.x + 8, vehicle.y + vehicle.height - 4, 3, 0, Math.PI * 2);
            this.ctx.arc(vehicle.x + vehicle.width - 8, vehicle.y + vehicle.height - 4, 3, 0, Math.PI * 2);
            this.ctx.fill();
          }
        } else {
          this.ctx.fillStyle = '#ff4757';
          if (vehicle.direction === 'north') {
            this.ctx.beginPath();
            this.ctx.arc(vehicle.x + 8, vehicle.y + vehicle.height - 4, 3, 0, Math.PI * 2);
            this.ctx.arc(vehicle.x + vehicle.width - 8, vehicle.y + vehicle.height - 4, 3, 0, Math.PI * 2);
            this.ctx.fill();
          } else {
            this.ctx.beginPath();
            this.ctx.arc(vehicle.x + 8, vehicle.y + 4, 3, 0, Math.PI * 2);
            this.ctx.arc(vehicle.x + vehicle.width - 8, vehicle.y + 4, 3, 0, Math.PI * 2);
            this.ctx.fill();
          }
        }
      }

      this.ctx.restore();
    });
  }

  roundRect(x, y, width, height, radius) {
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + width - radius, y);
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.ctx.lineTo(x + width, y + height - radius);
    this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    this.ctx.lineTo(x + radius, y + height);
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
  }
}

// ==================== 场景渲染 ====================
class SceneRenderer {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
  }

  draw() {
    this.ctx.clearRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
    this.drawBackground();
    this.drawRoads();
    this.drawLaneMarkings();
    this.drawStopLines();
  }

  drawBackground() {
    this.ctx.fillStyle = '#2d5016';
    this.ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);

    this.ctx.fillStyle = '#3d6b1e';
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * GAME_CONFIG.CANVAS_WIDTH;
      const y = Math.random() * GAME_CONFIG.CANVAS_HEIGHT;
      this.ctx.beginPath();
      this.ctx.arc(x, y, 2, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  drawRoads() {
    const centerX = GAME_CONFIG.CANVAS_WIDTH / 2;
    const centerY = GAME_CONFIG.CANVAS_HEIGHT / 2;
    const halfRoad = GAME_CONFIG.ROAD_WIDTH / 2;

    this.ctx.fillStyle = '#333';
    this.ctx.fillRect(centerX - halfRoad, 0, GAME_CONFIG.ROAD_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
    this.ctx.fillRect(0, centerY - halfRoad, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.ROAD_WIDTH);

    this.ctx.strokeStyle = '#555';
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(centerX - halfRoad, 0, GAME_CONFIG.ROAD_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
    this.ctx.strokeRect(0, centerY - halfRoad, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.ROAD_WIDTH);
  }

  drawLaneMarkings() {
    const centerX = GAME_CONFIG.CANVAS_WIDTH / 2;
    const centerY = GAME_CONFIG.CANVAS_HEIGHT / 2;
    const halfRoad = GAME_CONFIG.ROAD_WIDTH / 2;

    this.ctx.strokeStyle = '#fff';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([15, 10]);

    this.ctx.beginPath();
    this.ctx.moveTo(centerX, 0);
    this.ctx.lineTo(centerX, centerY - halfRoad);
    this.ctx.moveTo(centerX, centerY + halfRoad);
    this.ctx.lineTo(centerX, GAME_CONFIG.CANVAS_HEIGHT);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(0, centerY);
    this.ctx.lineTo(centerX - halfRoad, centerY);
    this.ctx.moveTo(centerX + halfRoad, centerY);
    this.ctx.lineTo(GAME_CONFIG.CANVAS_WIDTH, centerY);
    this.ctx.stroke();

    this.ctx.setLineDash([]);
  }

  drawStopLines() {
    const centerX = GAME_CONFIG.CANVAS_WIDTH / 2;
    const centerY = GAME_CONFIG.CANVAS_HEIGHT / 2;
    const halfRoad = GAME_CONFIG.ROAD_WIDTH / 2;

    this.ctx.strokeStyle = '#fff';
    this.ctx.lineWidth = 4;

    this.ctx.beginPath();
    this.ctx.moveTo(centerX - halfRoad, centerY + halfRoad - GAME_CONFIG.STOP_LINE_OFFSET);
    this.ctx.lineTo(centerX, centerY + halfRoad - GAME_CONFIG.STOP_LINE_OFFSET);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(centerX, centerY - halfRoad + GAME_CONFIG.STOP_LINE_OFFSET);
    this.ctx.lineTo(centerX + halfRoad, centerY - halfRoad + GAME_CONFIG.STOP_LINE_OFFSET);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(centerX - halfRoad + GAME_CONFIG.STOP_LINE_OFFSET, centerY - halfRoad);
    this.ctx.lineTo(centerX - halfRoad + GAME_CONFIG.STOP_LINE_OFFSET, centerY);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(centerX + halfRoad - GAME_CONFIG.STOP_LINE_OFFSET, centerY);
    this.ctx.lineTo(centerX + halfRoad - GAME_CONFIG.STOP_LINE_OFFSET, centerY + halfRoad);
    this.ctx.stroke();
  }
}

// ==================== 游戏主控制器 ====================
class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.trafficLightController = new TrafficLightController();
    this.vehicleGenerator = new VehicleGenerator();
    this.collisionDetector = new CollisionDetector();
    this.vehicleController = new VehicleController();
    this.sceneRenderer = new SceneRenderer();
    this.scoreManager = new ScoreManager();
    
    this.overlay = document.getElementById('overlay');
    this.overlayTitle = document.getElementById('overlayTitle');
    this.overlayMessage = document.getElementById('overlayMessage');
    this.startBtn = document.getElementById('startBtn');
    this.restartBtn = document.getElementById('restartBtn');
    
    this.animationId = null;
    this.bindEvents();
    this.renderInitialState();
  }

  bindEvents() {
    this.startBtn.addEventListener('click', () => this.start());
    this.restartBtn.addEventListener('click', () => this.restart());
  }

  renderInitialState() {
    this.sceneRenderer.draw();
  }

  start() {
    gameState.reset();
    gameState.isPlaying = true;
    this.scoreManager.reset();
    this.scoreManager.updateStatus('游戏中');
    this.trafficLightController.updateAllLights();
    
    this.overlay.classList.add('hidden');
    this.startBtn.disabled = true;
    this.restartBtn.disabled = false;

    this.gameLoop();
  }

  restart() {
    this.stop();
    this.start();
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    gameState.isPlaying = false;
  }

  gameOver(reason) {
    this.stop();
    gameState.isGameOver = true;
    this.scoreManager.updateStatus('游戏结束');
    
    this.overlayTitle.textContent = '游戏结束';
    if (reason === 'collision') {
      this.overlayMessage.textContent = `发生碰撞！最终得分：${gameState.score} 分`;
    } else if (reason === 'redlight') {
      this.overlayMessage.textContent = `车辆闯红灯！最终得分：${gameState.score} 分`;
    } else {
      this.overlayMessage.textContent = `时间到！最终得分：${gameState.score} 分`;
    }
    this.startBtn.textContent = '再玩一次';
    this.overlay.classList.remove('hidden');
    this.startBtn.disabled = false;
    this.restartBtn.disabled = true;
  }

  gameLoop(timestamp = 0) {
    if (!gameState.isPlaying) return;

    this.scoreManager.updateTimer(timestamp);
    if (gameState.timeLeft <= 0) {
      this.gameOver('time');
      return;
    }

    this.vehicleGenerator.trySpawn(timestamp);
    this.vehicleController.updateVehicles();

    if (this.collisionDetector.checkAllCollisions()) {
      this.gameOver('collision');
      return;
    }

    for (const vehicle of gameState.vehicles) {
      if (this.collisionDetector.checkRedLightViolation(vehicle)) {
        this.gameOver('redlight');
        return;
      }
    }

    this.sceneRenderer.draw();
    this.vehicleController.drawVehicles();

    this.animationId = requestAnimationFrame((t) => this.gameLoop(t));
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.game = new Game();
});
