const API_BASE = 'http://localhost:5000/api';

const PARTICLE_COLORS = {
    'e-': 0xff6b6b, 'e+': 0xff6b6b,
    'mu-': 0xffd93d, 'mu+': 0xffd93d,
    'tau-': 0xff9ff3, 'tau+': 0xff9ff3,
    'gamma': 0xfeca57,
    'pi+': 0x48dbfb, 'pi-': 0x48dbfb, 'pi0': 0x48dbfb,
    'K+': 0x1dd1a1, 'K-': 0x1dd1a1, 'K0': 0x1dd1a1,
    'p': 0x54a0ff, 'p_bar': 0x54a0ff,
    'n': 0x5f27cd, 'n_bar': 0x5f27cd,
    'Lambda': 0x00d2d3, 'Sigma+': 0x00d2d3,
    'D+': 0xff6b81, 'D-': 0xff6b81, 'D0': 0xff6b81,
    'B+': 0x7bed9f, 'B-': 0x7bed9f,
    'W+': 0xe17055, 'W-': 0xe17055,
    'Z': 0xfdcb6e,
    'H': 0xa29bfe,
    'g': 0x74b9ff,
    'eta': 0x00b894,
    'nu_e': 0x888888, 'nu_e_bar': 0x888888,
    'nu_mu': 0x888888, 'nu_mu_bar': 0x888888,
    'nu_tau': 0x888888, 'nu_tau_bar': 0x888888,
    'default': 0xffffff
};

let scene, camera, renderer, controls;
let particleObjects = [];
let currentEvent = null;
let selectedParticle = null;

function initThreeJS() {
    const container = document.getElementById('canvas-container');
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1a);
    
    camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 10000);
    camera.position.set(15, 10, 15);
    
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);
    
    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);
    
    createDetectorGeometry();
    createAxes();
    
    window.addEventListener('resize', onWindowResize);
    
    animate();
}

function createDetectorGeometry() {
    const beamPipeGeometry = new THREE.CylinderGeometry(0.1, 0.1, 20, 16);
    const beamPipeMaterial = new THREE.MeshPhongMaterial({
        color: 0x333366,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
    });
    const beamPipe = new THREE.Mesh(beamPipeGeometry, beamPipeMaterial);
    beamPipe.rotation.x = Math.PI / 2;
    scene.add(beamPipe);
    
    const trackerGeometry = new THREE.CylinderGeometry(3, 3, 12, 32, 1, true);
    const trackerMaterial = new THREE.MeshPhongMaterial({
        color: 0x2244aa,
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide
    });
    const tracker = new THREE.Mesh(trackerGeometry, trackerMaterial);
    tracker.rotation.x = Math.PI / 2;
    scene.add(tracker);
    
    const ecalGeometry = new THREE.CylinderGeometry(5, 5, 14, 32, 1, true);
    const ecalMaterial = new THREE.MeshPhongMaterial({
        color: 0x44aa44,
        transparent: true,
        opacity: 0.1,
        side: THREE.DoubleSide
    });
    const ecal = new THREE.Mesh(ecalGeometry, ecalMaterial);
    ecal.rotation.x = Math.PI / 2;
    scene.add(ecal);
    
    const hcalGeometry = new THREE.CylinderGeometry(7, 7, 16, 32, 1, true);
    const hcalMaterial = new THREE.MeshPhongMaterial({
        color: 0xaa4444,
        transparent: true,
        opacity: 0.1,
        side: THREE.DoubleSide
    });
    const hcal = new THREE.Mesh(hcalGeometry, hcalMaterial);
    hcal.rotation.x = Math.PI / 2;
    scene.add(hcal);
    
    const gridHelper = new THREE.GridHelper(20, 20, 0x333366, 0x222244);
    scene.add(gridHelper);
}

function createAxes() {
    const arrowX = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 5, 0xff0000, 0.5, 0.3);
    scene.add(arrowX);
    
    const arrowY = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 5, 0x00ff00, 0.5, 0.3);
    scene.add(arrowY);
    
    const arrowZ = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0), 5, 0x0000ff, 0.5, 0.3);
    scene.add(arrowZ);
}

function onWindowResize() {
    const container = document.getElementById('canvas-container');
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

function getParticleColor(name) {
    return PARTICLE_COLORS[name] || PARTICLE_COLORS['default'];
}

function generateHelixTrack(particle, trackLength, magneticField) {
    const points = [];
    const charge = particle.charge;
    const B = magneticField;
    
    const px = particle.px;
    const py = particle.py;
    const pz = particle.pz;
    const pt = Math.sqrt(px * px + py * py);
    const p = Math.sqrt(px * px + py * py + pz * pz);
    
    const phi0 = Math.atan2(py, px);
    const theta = Math.acos(pz / p);
    
    const qOverP = charge / p;
    const k = 0.3 * B * qOverP;
    const R = Math.abs(pt / (0.3 * B * Math.abs(charge))) || 1000;
    
    const nSteps = 100;
    const maxS = trackLength * 10;
    
    for (let i = 0; i <= nSteps; i++) {
        const s = (i / nSteps) * maxS;
        
        let x, y, z;
        
        if (Math.abs(charge) > 0 && B > 0 && pt > 0.01) {
            const dPhi = k * s * Math.sin(theta);
            const phi = phi0 + dPhi;
            
            x = R * (Math.sin(phi) - Math.sin(phi0));
            y = R * (-Math.cos(phi) + Math.cos(phi0));
            z = s * Math.cos(theta);
        } else {
            x = (px / p) * s;
            y = (py / p) * s;
            z = (pz / p) * s;
        }
        
        const scale = 0.5;
        points.push(new THREE.Vector3(x * scale, y * scale, z * scale));
    }
    
    return points;
}

function createParticleTrack(particle, index) {
    const trackLength = parseFloat(document.getElementById('track-length').value);
    const magneticField = parseFloat(document.getElementById('magnetic-field').value);
    
    const points = generateHelixTrack(particle, trackLength, magneticField);
    
    const color = getParticleColor(particle.name);
    
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.8,
        linewidth: 2
    });
    
    const line = new THREE.Line(geometry, material);
    line.userData = { particle: particle, index: index, isTrack: true };
    
    const startPoint = points[0];
    const endPoint = points[points.length - 1];
    
    const endGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const endMaterial = new THREE.MeshBasicMaterial({ color: color });
    const endSphere = new THREE.Mesh(endGeometry, endMaterial);
    endSphere.position.copy(endPoint);
    endSphere.userData = { particle: particle, index: index, isEndPoint: true };
    
    scene.add(line);
    scene.add(endSphere);
    
    particleObjects.push({ line: line, endSphere: endSphere, particle: particle });
    
    return { line, endSphere };
}

function clearScene() {
    particleObjects.forEach(obj => {
        scene.remove(obj.line);
        scene.remove(obj.endSphere);
        if (obj.line.geometry) obj.line.geometry.dispose();
        if (obj.line.material) obj.line.material.dispose();
        if (obj.endSphere.geometry) obj.endSphere.geometry.dispose();
        if (obj.endSphere.material) obj.endSphere.material.dispose();
    });
    particleObjects = [];
    selectedParticle = null;
    
    document.getElementById('decay-chain').innerHTML = '<p style="color: #888; text-align: center;">选择一个粒子查看衰变链</p>';
}

function shouldShowParticle(particle) {
    const filterCharged = document.getElementById('filter-charged').checked;
    const filterNeutral = document.getElementById('filter-neutral').checked;
    const filterElectron = document.getElementById('filter-electron').checked;
    const filterMuon = document.getElementById('filter-muon').checked;
    const filterPhoton = document.getElementById('filter-photon').checked;
    const filterHadron = document.getElementById('filter-hadron').checked;
    const filterHiggs = document.getElementById('filter-higgs').checked;
    
    const isCharged = Math.abs(particle.charge) > 0;
    const isNeutral = Math.abs(particle.charge) === 0;
    
    if (isCharged && !filterCharged) return false;
    if (isNeutral && !filterNeutral) return false;
    
    const name = particle.name;
    if (['e-', 'e+'].includes(name) && !filterElectron) return false;
    if (['mu-', 'mu+'].includes(name) && !filterMuon) return false;
    if (name === 'gamma' && !filterPhoton) return false;
    if (['pi+', 'pi-', 'pi0', 'K+', 'K-', 'K0', 'p', 'p_bar', 'n', 'n_bar', 'Lambda', 'Sigma+', 'D+', 'D-', 'D0', 'B+', 'B-', 'eta'].includes(name) && !filterHadron) return false;
    if (['H', 'Z', 'W+', 'W-'].includes(name) && !filterHiggs) return false;
    
    return true;
}

function visualizeEvent(eventData) {
    clearScene();
    
    currentEvent = eventData;
    
    document.getElementById('stat-collision').textContent = eventData.event.collision_type;
    document.getElementById('stat-energy').textContent = eventData.event.sqrt_s + ' GeV';
    document.getElementById('stat-process').textContent = eventData.event.process;
    document.getElementById('stat-n-all').textContent = eventData.event.n_all;
    document.getElementById('stat-n-stable').textContent = eventData.event.n_stable;
    
    const stableParticles = eventData.stable_particles;
    
    stableParticles.forEach((particle, index) => {
        if (shouldShowParticle(particle)) {
            createParticleTrack(particle, index);
        }
    });
    
    updateParticleList();
}

function updateParticleList() {
    const panel = document.getElementById('info-panel');
    
    if (!currentEvent) {
        panel.innerHTML = '<p style="color: #888; text-align: center;">点击"开始对撞"生成事件</p>';
        return;
    }
    
    const primaryParticles = currentEvent.all_particles;
    const stableParticles = currentEvent.stable_particles;
    
    if (primaryParticles.length === 0 && stableParticles.length === 0) {
        panel.innerHTML = '<p style="color: #888; text-align: center;">没有粒子数据</p>';
        return;
    }
    
    let html = '';
    
    if (primaryParticles.length > 0) {
        html += '<div style="color: #ffd54f; font-size: 12px; margin-bottom: 8px; font-weight: bold;">📊 初级粒子</div>';
        primaryParticles.forEach((particle, index) => {
            if (!shouldShowParticle(particle)) return;
            
            const isSelected = selectedParticle === `primary_${index}`;
            html += `
                <div class="particle-info ${isSelected ? 'selected' : ''}" data-type="primary" data-index="${index}">
                    <div class="particle-name">${particle.name} (PDG: ${particle.pdg_id})</div>
                    <div class="particle-details">
                        E: ${particle.e.toFixed(2)} GeV | p<sub>T</sub>: ${particle.pt.toFixed(2)} GeV<br>
                        η: ${particle.eta.toFixed(2)} | φ: ${particle.phi.toFixed(2)}<br>
                        电荷: ${particle.charge.toFixed(1)} | 质量: ${particle.mass.toFixed(3)} GeV
                    </div>
                </div>
            `;
        });
    }
    
    if (stableParticles.length > 0) {
        html += '<div style="color: #81c784; font-size: 12px; margin: 15px 0 8px 0; font-weight: bold;">⚡ 末态稳定粒子</div>';
        stableParticles.forEach((particle, index) => {
            if (!shouldShowParticle(particle)) return;
            
            const isSelected = selectedParticle === `stable_${index}`;
            html += `
                <div class="particle-info ${isSelected ? 'selected' : ''}" data-type="stable" data-index="${index}">
                    <div class="particle-name">${particle.name} (PDG: ${particle.pdg_id})</div>
                    <div class="particle-details">
                        E: ${particle.e.toFixed(2)} GeV | p<sub>T</sub>: ${particle.pt.toFixed(2)} GeV<br>
                        η: ${particle.eta.toFixed(2)} | φ: ${particle.phi.toFixed(2)}<br>
                        电荷: ${particle.charge.toFixed(1)} | 质量: ${particle.mass.toFixed(3)} GeV
                    </div>
                </div>
            `;
        });
    }
    
    panel.innerHTML = html;
    
    panel.querySelectorAll('.particle-info').forEach(el => {
        el.addEventListener('click', () => {
            const type = el.dataset.type;
            const index = parseInt(el.dataset.index);
            selectParticle(type, index);
        });
    });
}

function selectParticle(type, index) {
    selectedParticle = `${type}_${index}`;
    
    let selectedParticleData = null;
    if (type === 'primary') {
        selectedParticleData = currentEvent.all_particles[index];
    } else {
        selectedParticleData = currentEvent.stable_particles[index];
    }
    
    particleObjects.forEach(obj => {
        const material = obj.line.material;
        if (type === 'stable' && obj.particle === selectedParticleData) {
            material.opacity = 1.0;
            material.linewidth = 4;
        } else {
            material.opacity = 0.3;
            material.linewidth = 1;
        }
    });
    
    updateParticleList();
    showDecayChain(type, index);
}

function showDecayChain(type, index) {
    const container = document.getElementById('decay-chain');
    let particle = null;
    
    if (type === 'primary') {
        particle = currentEvent.all_particles[index];
    } else {
        particle = currentEvent.stable_particles[index];
    }
    
    if (!particle || !particle.decay_products || particle.decay_products.length === 0) {
        container.innerHTML = '<p style="color: #888; text-align: center;">该粒子没有衰变产物</p>';
        return;
    }
    
    let html = '';
    
    function renderDecay(p, depth = 0) {
        const indent = depth * 20;
        html += `
            <div class="decay-node" style="margin-left: ${indent}px;">
                <strong>${p.name}</strong> (PDG: ${p.pdg_id})<br>
                <small>E: ${p.e.toFixed(2)} GeV | p<sub>T</sub>: ${p.pt.toFixed(2)} GeV</small>
            </div>
        `;
        
        if (p.decay_products && p.decay_products.length > 0) {
            html += '<div class="decay-arrow">↓</div>';
            p.decay_products.forEach(dp => renderDecay(dp, depth + 1));
        }
    }
    
    renderDecay(particle);
    container.innerHTML = html;
}

async function simulateCollision() {
    const loading = document.getElementById('loading');
    loading.style.display = 'block';
    
    try {
        const collisionType = document.getElementById('collision-type').value;
        const sqrtS = parseFloat(document.getElementById('energy').value);
        const process = document.getElementById('process').value;
        
        const response = await fetch(`${API_BASE}/simulate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                collision_type: collisionType,
                sqrt_s: sqrtS,
                process: process
            })
        });
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        visualizeEvent(data);
        
    } catch (error) {
        console.error('Simulation error:', error);
        alert('模拟失败: ' + error.message);
    } finally {
        loading.style.display = 'none';
    }
}

function updateEnergyRange() {
    const collisionType = document.getElementById('collision-type').value;
    const energySlider = document.getElementById('energy');
    
    if (collisionType === 'e+e-') {
        energySlider.min = 10;
        energySlider.max = 1000;
        energySlider.value = 91;
        energySlider.step = 1;
        document.getElementById('energy-value').textContent = '91 GeV';
    } else if (collisionType === 'pp') {
        energySlider.min = 10;
        energySlider.max = 14000;
        energySlider.value = 13000;
        energySlider.step = 10;
        document.getElementById('energy-value').textContent = '13000 GeV';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initThreeJS();
    
    document.getElementById('simulate-btn').addEventListener('click', simulateCollision);
    document.getElementById('clear-btn').addEventListener('click', clearScene);
    
    document.getElementById('energy').addEventListener('input', (e) => {
        document.getElementById('energy-value').textContent = e.target.value + ' GeV';
    });
    
    document.getElementById('track-length').addEventListener('input', (e) => {
        document.getElementById('track-length-value').textContent = e.target.value;
        if (currentEvent) {
            visualizeEvent(currentEvent);
        }
    });
    
    document.getElementById('magnetic-field').addEventListener('input', (e) => {
        document.getElementById('magnetic-field-value').textContent = e.target.value + ' T';
        if (currentEvent) {
            visualizeEvent(currentEvent);
        }
    });
    
    document.getElementById('collision-type').addEventListener('change', updateEnergyRange);
    
    const filterCheckboxes = [
        'filter-charged', 'filter-neutral', 'filter-electron',
        'filter-muon', 'filter-photon', 'filter-hadron', 'filter-higgs'
    ];
    
    filterCheckboxes.forEach(id => {
        document.getElementById(id).addEventListener('change', () => {
            if (currentEvent) {
                visualizeEvent(currentEvent);
            }
        });
    });
});
