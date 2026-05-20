import numpy as np
from particle_data import PARTICLE_DATABASE, DECAY_TABLE, QUARK_TO_HADRON, get_particle_info

_particle_id_counter = 0


def _get_next_particle_id():
    global _particle_id_counter
    _particle_id_counter += 1
    return _particle_id_counter


def reset_particle_id_counter():
    global _particle_id_counter
    _particle_id_counter = 0


class Particle:
    def __init__(self, pdg_id, px=0, py=0, pz=0, e=None, status=1, parent_id=None):
        global _particle_id_counter
        self.id = _get_next_particle_id()
        self.pdg_id = pdg_id
        self.px = px
        self.py = py
        self.pz = pz
        info = get_particle_info(pdg_id)
        self.mass = info["mass"]
        self.charge = info["charge"]
        self.name = info["name"]
        self.stable = info.get("stable", False)
        self.lifetime = info.get("lifetime", None)
        self.status = status
        self.parent_id = parent_id
        self.decay_products = []
        
        if e is None:
            self.e = np.sqrt(self.mass**2 + px**2 + py**2 + pz**2)
        else:
            self.e = e
    
    def momentum(self):
        return np.sqrt(self.px**2 + self.py**2 + self.pz**2)
    
    def pt(self):
        return np.sqrt(self.px**2 + self.py**2)
    
    def eta(self):
        p = self.momentum()
        if p == 0:
            return 0
        if p == abs(self.pz):
            return np.sign(self.pz) * 10
        return 0.5 * np.log((p + self.pz) / (p - self.pz))
    
    def phi(self):
        return np.arctan2(self.py, self.px)
    
    def to_dict(self):
        return {
            "id": self.id,
            "pdg_id": self.pdg_id,
            "name": self.name,
            "mass": float(self.mass),
            "charge": float(self.charge),
            "px": float(self.px),
            "py": float(self.py),
            "pz": float(self.pz),
            "e": float(self.e),
            "pt": float(self.pt()),
            "eta": float(self.eta()),
            "phi": float(self.phi()),
            "status": self.status,
            "parent_id": self.parent_id,
            "stable": self.stable,
            "decay_products": [p.to_dict() for p in self.decay_products]
        }


def generate_rambo_2_body(sqrt_s, pdg1, pdg2):
    m1 = PARTICLE_DATABASE[pdg1]["mass"]
    m2 = PARTICLE_DATABASE[pdg2]["mass"]
    
    e_cm = sqrt_s / 2.0
    p_cm = np.sqrt(max(0, e_cm**2 - m1**2))
    
    costheta = 2 * np.random.random() - 1
    sintheta = np.sqrt(1 - costheta**2)
    phi = 2 * np.pi * np.random.random()
    
    px = p_cm * sintheta * np.cos(phi)
    py = p_cm * sintheta * np.sin(phi)
    pz = p_cm * costheta
    
    p1 = Particle(pdg1, px, py, pz, e_cm)
    p2 = Particle(pdg2, -px, -py, -pz, e_cm)
    
    return p1, p2


def generate_rambo_n_body(sqrt_s, pdg_ids):
    masses = [PARTICLE_DATABASE[pid]["mass"] for pid in pdg_ids]
    n = len(masses)
    if n == 2:
        return generate_rambo_2_body(sqrt_s, pdg_ids[0], pdg_ids[1])
    
    M = sqrt_s
    sum_m = sum(masses)
    if M < sum_m:
        return None
    
    rho = np.random.random(size=n - 1)
    rho.sort()
    
    k = np.zeros(n)
    k[0] = 0
    k[n - 1] = 1
    for i in range(1, n - 1):
        k[i] = rho[i - 1]
    
    Q = np.zeros(n)
    for i in range(n):
        if i == 0:
            Q[i] = k[i] * M - masses[i]
        elif i == n - 1:
            Q[i] = (1 - k[i - 1]) * M - masses[i]
        else:
            Q[i] = (k[i] - k[i - 1]) * M - masses[i]
    
    particles = []
    for i in range(n):
        costheta = 2 * np.random.random() - 1
        sintheta = np.sqrt(1 - costheta**2)
        phi = 2 * np.pi * np.random.random()
        
        p = Q[i] / 2
        px = p * sintheta * np.cos(phi)
        py = p * sintheta * np.sin(phi)
        pz = p * costheta
        e = np.sqrt(masses[i]**2 + p**2)
        
        particles.append(Particle(pdg_ids[i], px, py, pz, e))
    
    return particles


def select_decay_channel(pdg_id):
    if pdg_id not in DECAY_TABLE:
        return None
    
    channels = DECAY_TABLE[pdg_id]
    r = np.random.random()
    cumulative = 0
    
    for channel in channels:
        cumulative += channel["branching"]
        if r < cumulative:
            return channel["products"]
    
    return channels[-1]["products"]


def quark_to_hadron(quark_pdg):
    abs_pdg = abs(quark_pdg)
    if abs_pdg not in QUARK_TO_HADRON:
        return None
    
    hadrons = QUARK_TO_HADRON[abs_pdg]
    hadron = np.random.choice(hadrons)
    
    if quark_pdg < 0:
        if hadron in PARTICLE_DATABASE and -hadron in PARTICLE_DATABASE:
            return -hadron
    return hadron


def hadronize(particles):
    result = []
    for p in particles:
        if abs(p.pdg_id) in [1, 2, 3, 4, 5]:
            hadron = quark_to_hadron(p.pdg_id)
            if hadron is not None:
                new_p = Particle(hadron, p.px, p.py, p.pz, p.e, status=p.status, parent_id=p.parent_id)
                result.append(new_p)
            else:
                result.append(p)
        else:
            result.append(p)
    return result


def decay_particle(particle, depth=0, max_depth=5):
    if depth >= max_depth:
        return [particle]
    
    if particle.stable or particle.lifetime is None:
        return [particle]
    
    decay_products = select_decay_channel(particle.pdg_id)
    if decay_products is None:
        return [particle]
    
    masses = [PARTICLE_DATABASE[pid]["mass"] for pid in decay_products]
    sum_m = sum(masses)
    
    if particle.e < sum_m or particle.mass < sum_m:
        return [particle]
    
    e_cm = particle.e
    p_cm = np.sqrt(max(0, e_cm**2 - particle.mass**2))
    
    beta = p_cm / e_cm if e_cm > 0 else 0
    gamma = e_cm / particle.mass if particle.mass > 0 else 1
    
    products_cm = generate_rambo_n_body(2 * e_cm, decay_products)
    if products_cm is None:
        return [particle]
    
    boosted_products = []
    for prod in products_cm:
        e_lab = gamma * (prod.e + beta * prod.pz)
        pz_lab = gamma * (prod.pz + beta * prod.e)
        px_lab = prod.px
        py_lab = prod.py
        
        prod.px = px_lab
        prod.py = py_lab
        prod.pz = pz_lab
        prod.e = e_lab
        prod.status = 2
        prod.parent_id = particle.id
        boosted_products.append(prod)
    
    particle.decay_products = boosted_products
    
    all_products = []
    for prod in boosted_products:
        decayed = decay_particle(prod, depth + 1, max_depth)
        all_products.extend(decayed)
    
    return all_products


def simulate_electron_positron(sqrt_s, process="generic"):
    if process == "higgs" and sqrt_s >= 2 * PARTICLE_DATABASE[25]["mass"]:
        m_h = PARTICLE_DATABASE[25]["mass"]
        if sqrt_s >= 2 * m_h:
            higgs1 = Particle(25, 0, 0, sqrt_s / 4, sqrt_s / 2)
            higgs2 = Particle(25, 0, 0, -sqrt_s / 4, sqrt_s / 2)
            
            all_particles = [higgs1, higgs2]
            stable_particles = []
            
            for p in all_particles:
                decayed = decay_particle(p)
                stable_particles.extend(decayed)
            
            stable_particles = hadronize(stable_particles)
            return all_particles, stable_particles
    
    if process == "z" and abs(sqrt_s - PARTICLE_DATABASE[23]["mass"]) < 10:
        m_z = PARTICLE_DATABASE[23]["mass"]
        z = Particle(23, 0, 0, 0, sqrt_s)
        
        all_particles = [z]
        stable_particles = decay_particle(z)
        stable_particles = hadronize(stable_particles)
        return all_particles, stable_particles
    
    if process == "generic":
        n_particles = np.random.poisson(15) + 5
        all_particles = []
        stable_particles = []
        
        for _ in range(n_particles // 2):
            pdg_choices = [11, 13, 211, 321, 2212, 22]
            pdg = np.random.choice(pdg_choices)
            
            p_mag = np.random.exponential(sqrt_s / 20)
            costheta = 2 * np.random.random() - 1
            sintheta = np.sqrt(1 - costheta**2)
            phi = 2 * np.pi * np.random.random()
            
            px = p_mag * sintheta * np.cos(phi)
            py = p_mag * sintheta * np.sin(phi)
            pz = p_mag * costheta
            
            if pdg in PARTICLE_DATABASE:
                m = PARTICLE_DATABASE[pdg]["mass"]
                e = np.sqrt(m**2 + p_mag**2)
                
                p1 = Particle(pdg, px, py, pz, e)
                p2 = Particle(-pdg, -px, -py, -pz, e)
                
                all_particles.extend([p1, p2])
                
                d1 = decay_particle(p1)
                d2 = decay_particle(p2)
                stable_particles.extend(d1)
                stable_particles.extend(d2)
        
        stable_particles = hadronize(stable_particles)
        return all_particles, stable_particles
    
    return [], []


def simulate_proton_proton(sqrt_s, process="generic"):
    if process == "higgs" and sqrt_s >= 2 * PARTICLE_DATABASE[25]["mass"]:
        m_h = PARTICLE_DATABASE[25]["mass"]
        p_h = np.sqrt(max(0, (sqrt_s / 2)**2 - m_h**2))
        
        costheta = 2 * np.random.random() - 1
        sintheta = np.sqrt(1 - costheta**2)
        phi = 2 * np.pi * np.random.random()
        
        px = p_h * sintheta * np.cos(phi)
        py = p_h * sintheta * np.sin(phi)
        pz = p_h * costheta
        e = np.sqrt(m_h**2 + p_h**2)
        
        higgs = Particle(25, px, py, pz, e)
        
        all_particles = [higgs]
        stable_particles = decay_particle(higgs)
        stable_particles = hadronize(stable_particles)
        
        n_underlying = np.random.poisson(20)
        for _ in range(n_underlying):
            pdg = np.random.choice([211, -211, 111, 321, -321, 2212, -2212])
            if pdg not in PARTICLE_DATABASE:
                continue
            
            p_mag = np.random.exponential(0.5)
            costheta_u = 2 * np.random.random() - 1
            sintheta_u = np.sqrt(1 - costheta_u**2)
            phi_u = 2 * np.pi * np.random.random()
            
            px_u = p_mag * sintheta_u * np.cos(phi_u)
            py_u = p_mag * sintheta_u * np.sin(phi_u)
            pz_u = p_mag * costheta_u
            m = PARTICLE_DATABASE[pdg]["mass"]
            e_u = np.sqrt(m**2 + p_mag**2)
            
            p = Particle(pdg, px_u, py_u, pz_u, e_u)
            all_particles.append(p)
            stable_particles.extend(decay_particle(p))
        
        return all_particles, stable_particles
    
    if process == "generic":
        n_particles = np.random.poisson(30) + 10
        all_particles = []
        stable_particles = []
        
        for _ in range(n_particles):
            pdg_choices = [11, -11, 13, -13, 211, -211, 111, 321, -321, 2212, -2212, 2112, 22]
            pdg = np.random.choice(pdg_choices)
            
            if pdg not in PARTICLE_DATABASE:
                continue
            
            p_mag = np.random.exponential(sqrt_s / 50)
            costheta = 2 * np.random.random() - 1
            sintheta = np.sqrt(1 - costheta**2)
            phi = 2 * np.pi * np.random.random()
            
            px = p_mag * sintheta * np.cos(phi)
            py = p_mag * sintheta * np.sin(phi)
            pz = p_mag * costheta
            m = PARTICLE_DATABASE[pdg]["mass"]
            e = np.sqrt(m**2 + p_mag**2)
            
            p = Particle(pdg, px, py, pz, e)
            all_particles.append(p)
            stable_particles.extend(decay_particle(p))
        
        return all_particles, stable_particles
    
    return [], []


def simulate_collision(collision_type, sqrt_s, process="generic"):
    reset_particle_id_counter()
    if collision_type == "e+e-":
        return simulate_electron_positron(sqrt_s, process)
    elif collision_type == "pp":
        return simulate_proton_proton(sqrt_s, process)
    else:
        return [], []
