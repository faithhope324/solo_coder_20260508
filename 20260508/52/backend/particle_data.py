import numpy as np

PARTICLE_DATABASE = {
    1: {"name": "d", "mass": 0.0048, "charge": -1/3, "color": 3, "stable": False, "lifetime": 1e-12},
    -1: {"name": "d_bar", "mass": 0.0048, "charge": 1/3, "color": 3, "stable": False, "lifetime": 1e-12},
    2: {"name": "u", "mass": 0.0023, "charge": 2/3, "color": 3, "stable": False, "lifetime": 1e-12},
    -2: {"name": "u_bar", "mass": 0.0023, "charge": -2/3, "color": 3, "stable": False, "lifetime": 1e-12},
    3: {"name": "s", "mass": 0.095, "charge": -1/3, "color": 3, "stable": False, "lifetime": 1e-12},
    -3: {"name": "s_bar", "mass": 0.095, "charge": 1/3, "color": 3, "stable": False, "lifetime": 1e-12},
    4: {"name": "c", "mass": 1.27, "charge": 2/3, "color": 3, "stable": False, "lifetime": 1e-12},
    -4: {"name": "c_bar", "mass": 1.27, "charge": -2/3, "color": 3, "stable": False, "lifetime": 1e-12},
    5: {"name": "b", "mass": 4.18, "charge": -1/3, "color": 3, "stable": False, "lifetime": 1e-12},
    -5: {"name": "b_bar", "mass": 4.18, "charge": 1/3, "color": 3, "stable": False, "lifetime": 1e-12},
    11: {"name": "e-", "mass": 0.000511, "charge": -1, "color": 0, "stable": True, "lifetime": None},
    -11: {"name": "e+", "mass": 0.000511, "charge": 1, "color": 0, "stable": True, "lifetime": None},
    12: {"name": "nu_e", "mass": 0, "charge": 0, "color": 0, "stable": True, "lifetime": None},
    -12: {"name": "nu_e_bar", "mass": 0, "charge": 0, "color": 0, "stable": True, "lifetime": None},
    13: {"name": "mu-", "mass": 0.10566, "charge": -1, "color": 0, "stable": False, "lifetime": 2.2e-6},
    -13: {"name": "mu+", "mass": 0.10566, "charge": 1, "color": 0, "stable": False, "lifetime": 2.2e-6},
    14: {"name": "nu_mu", "mass": 0, "charge": 0, "color": 0, "stable": True, "lifetime": None},
    -14: {"name": "nu_mu_bar", "mass": 0, "charge": 0, "color": 0, "stable": True, "lifetime": None},
    15: {"name": "tau-", "mass": 1.77686, "charge": -1, "color": 0, "stable": False, "lifetime": 2.9e-13},
    -15: {"name": "tau+", "mass": 1.77686, "charge": 1, "color": 0, "stable": False, "lifetime": 2.9e-13},
    16: {"name": "nu_tau", "mass": 0, "charge": 0, "color": 0, "stable": True, "lifetime": None},
    -16: {"name": "nu_tau_bar", "mass": 0, "charge": 0, "color": 0, "stable": True, "lifetime": None},
    21: {"name": "g", "mass": 0, "charge": 0, "color": 8, "stable": True, "lifetime": None},
    22: {"name": "gamma", "mass": 0, "charge": 0, "color": 0, "stable": True, "lifetime": None},
    23: {"name": "Z", "mass": 91.1876, "charge": 0, "color": 0, "stable": False, "lifetime": 3e-25},
    24: {"name": "W+", "mass": 80.379, "charge": 1, "color": 0, "stable": False, "lifetime": 3e-25},
    -24: {"name": "W-", "mass": 80.379, "charge": -1, "color": 0, "stable": False, "lifetime": 3e-25},
    25: {"name": "H", "mass": 125.18, "charge": 0, "color": 0, "stable": False, "lifetime": 1.6e-22},
    111: {"name": "pi0", "mass": 0.13498, "charge": 0, "color": 0, "stable": False, "lifetime": 8.5e-17},
    211: {"name": "pi+", "mass": 0.13957, "charge": 1, "color": 0, "stable": False, "lifetime": 2.6e-8},
    -211: {"name": "pi-", "mass": 0.13957, "charge": -1, "color": 0, "stable": False, "lifetime": 2.6e-8},
    221: {"name": "eta", "mass": 0.54786, "charge": 0, "color": 0, "stable": False, "lifetime": 5e-19},
    311: {"name": "K0", "mass": 0.49761, "charge": 0, "color": 0, "stable": False, "lifetime": 8.9e-11},
    321: {"name": "K+", "mass": 0.49368, "charge": 1, "color": 0, "stable": False, "lifetime": 1.2e-8},
    -321: {"name": "K-", "mass": 0.49368, "charge": -1, "color": 0, "stable": False, "lifetime": 1.2e-8},
    411: {"name": "D+", "mass": 1.86962, "charge": 1, "color": 0, "stable": False, "lifetime": 1e-12},
    -411: {"name": "D-", "mass": 1.86962, "charge": -1, "color": 0, "stable": False, "lifetime": 1e-12},
    421: {"name": "D0", "mass": 1.86484, "charge": 0, "color": 0, "stable": False, "lifetime": 4.1e-13},
    511: {"name": "B+", "mass": 5.27932, "charge": 1, "color": 0, "stable": False, "lifetime": 1.6e-12},
    -511: {"name": "B-", "mass": 5.27932, "charge": -1, "color": 0, "stable": False, "lifetime": 1.6e-12},
    2212: {"name": "p", "mass": 0.93827, "charge": 1, "color": 0, "stable": True, "lifetime": None},
    -2212: {"name": "p_bar", "mass": 0.93827, "charge": -1, "color": 0, "stable": True, "lifetime": None},
    2112: {"name": "n", "mass": 0.93957, "charge": 0, "color": 0, "stable": False, "lifetime": 881},
    -2112: {"name": "n_bar", "mass": 0.93957, "charge": 0, "color": 0, "stable": False, "lifetime": 881},
    3122: {"name": "Lambda", "mass": 1.11568, "charge": 0, "color": 0, "stable": False, "lifetime": 2.6e-10},
    3222: {"name": "Sigma+", "mass": 1.18937, "charge": 1, "color": 0, "stable": False, "lifetime": 8e-11},
}

DECAY_TABLE = {
    25: [
        {"products": [5, -5], "branching": 0.58},
        {"products": [24, -24], "branching": 0.21},
        {"products": [23, 23], "branching": 0.063},
        {"products": [22, 22], "branching": 0.0023},
        {"products": [15, -15], "branching": 0.063},
        {"products": [4, -4], "branching": 0.029},
    ],
    23: [
        {"products": [11, -11], "branching": 0.034},
        {"products": [13, -13], "branching": 0.034},
        {"products": [15, -15], "branching": 0.034},
        {"products": [1, -1], "branching": 0.15},
        {"products": [2, -2], "branching": 0.15},
        {"products": [3, -3], "branching": 0.15},
        {"products": [4, -4], "branching": 0.15},
        {"products": [5, -5], "branching": 0.15},
        {"products": [12, -12], "branching": 0.067},
        {"products": [14, -14], "branching": 0.067},
        {"products": [16, -16], "branching": 0.067},
    ],
    24: [
        {"products": [11, 12], "branching": 0.11},
        {"products": [13, 14], "branching": 0.11},
        {"products": [15, 16], "branching": 0.11},
        {"products": [2, -1], "branching": 0.67},
    ],
    -24: [
        {"products": [-11, -12], "branching": 0.11},
        {"products": [-13, -14], "branching": 0.11},
        {"products": [-15, -16], "branching": 0.11},
        {"products": [-2, 1], "branching": 0.67},
    ],
    111: [
        {"products": [22, 22], "branching": 0.988},
    ],
    211: [
        {"products": [13, 14], "branching": 0.999},
    ],
    -211: [
        {"products": [-13, -14], "branching": 0.999},
    ],
    13: [
        {"products": [11, 12, -14], "branching": 1.0},
    ],
    -13: [
        {"products": [-11, -12, 14], "branching": 1.0},
    ],
    15: [
        {"products": [13, 14, -16], "branching": 0.17},
        {"products": [11, 12, -16], "branching": 0.18},
        {"products": [211, 16], "branching": 0.12},
        {"products": [321, 16], "branching": 0.01},
    ],
    -15: [
        {"products": [-13, -14, 16], "branching": 0.17},
        {"products": [-11, -12, 16], "branching": 0.18},
        {"products": [-211, -16], "branching": 0.12},
        {"products": [-321, -16], "branching": 0.01},
    ],
    321: [
        {"products": [13, 14], "branching": 0.64},
        {"products": [211, 111], "branching": 0.21},
    ],
    -321: [
        {"products": [-13, -14], "branching": 0.64},
        {"products": [-211, 111], "branching": 0.21},
    ],
    411: [
        {"products": [211, 111], "branching": 0.03},
        {"products": [13, 14, 321], "branching": 0.02},
    ],
    -411: [
        {"products": [-211, 111], "branching": 0.03},
        {"products": [-13, -14, -321], "branching": 0.02},
    ],
    511: [
        {"products": [211, 321, 111], "branching": 0.001},
        {"products": [211, 321], "branching": 0.001},
    ],
    -511: [
        {"products": [-211, -321, 111], "branching": 0.001},
        {"products": [-211, -321], "branching": 0.001},
    ],
    2112: [
        {"products": [2212, 11, -12], "branching": 1.0},
    ],
    311: [
        {"products": [211, -211], "branching": 0.69},
        {"products": [111, 111, 111], "branching": 0.31},
    ],
    3122: [
        {"products": [2212, 211], "branching": 0.64},
        {"products": [2212, 111], "branching": 0.36},
    ],
}

QUARK_TO_HADRON = {
    1: [111, 211, 221, 311, 321, 2112, 2212, 3122, 3222],
    2: [111, 211, 221, 311, 321, 2112, 2212, 3122, 3222],
    3: [311, 321, 221, 3122, 3222],
    4: [411, 421],
    5: [511],
}

COLORS = {
    "e-": "#ff6b6b",
    "e+": "#ff6b6b",
    "mu-": "#ffd93d",
    "mu+": "#ffd93d",
    "tau-": "#ff9ff3",
    "tau+": "#ff9ff3",
    "gamma": "#feca57",
    "pi+": "#48dbfb",
    "pi-": "#48dbfb",
    "pi0": "#48dbfb",
    "K+": "#1dd1a1",
    "K-": "#1dd1a1",
    "K0": "#1dd1a1",
    "p": "#54a0ff",
    "p_bar": "#54a0ff",
    "n": "#5f27cd",
    "n_bar": "#5f27cd",
    "Lambda": "#00d2d3",
    "Sigma+": "#00d2d3",
    "D+": "#ff6b81",
    "D-": "#ff6b81",
    "D0": "#ff6b81",
    "B+": "#7bed9f",
    "B-": "#7bed9f",
    "W+": "#e17055",
    "W-": "#e17055",
    "Z": "#fdcb6e",
    "H": "#a29bfe",
    "g": "#74b9ff",
    "eta": "#00b894",
    "default": "#ffffff",
}


def get_particle_info(pdg_id):
    return PARTICLE_DATABASE.get(pdg_id, {"name": f"unknown_{pdg_id}", "mass": 0, "charge": 0, "color": 0})


def get_particle_color(name):
    return COLORS.get(name, COLORS["default"])
