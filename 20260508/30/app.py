import numpy as np
import json
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

class GeneticAlgorithm:
    def __init__(self, pop_size=50, mutation_rate=0.01, generations=100, 
                 selection_strategy='roulette', chrom_length=20, x_min=0, x_max=2):
        self.pop_size = pop_size
        self.mutation_rate = mutation_rate
        self.generations = generations
        self.selection_strategy = selection_strategy
        self.chrom_length = chrom_length
        self.x_min = x_min
        self.x_max = x_max
        self.population = []
        self.best_fitness_history = []
        self.avg_fitness_history = []
        self.final_population = []
    
    def fitness(self, x):
        return x * np.sin(10 * np.pi * x) + 1
    
    def encode(self, x):
        normalized = (x - self.x_min) / (self.x_max - self.x_min)
        integer = int(normalized * (2 ** self.chrom_length - 1))
        return format(integer, f'0{self.chrom_length}b')
    
    def decode(self, chrom):
        integer = int(chrom, 2)
        normalized = integer / (2 ** self.chrom_length - 1)
        return self.x_min + normalized * (self.x_max - self.x_min)
    
    def init_population(self):
        self.population = []
        for _ in range(self.pop_size):
            x = np.random.uniform(self.x_min, self.x_max)
            self.population.append(self.encode(x))
    
    def select_roulette(self, fitness_values):
        min_fitness = min(fitness_values)
        if min_fitness < 0:
            fitness_values = [f - min_fitness + 0.1 for f in fitness_values]
        total_fitness = sum(fitness_values)
        if total_fitness <= 0:
            return np.random.choice(len(fitness_values))
        probabilities = [f / total_fitness for f in fitness_values]
        return np.random.choice(len(fitness_values), p=probabilities)
    
    def select_tournament(self, fitness_values, tournament_size=3):
        participants = np.random.choice(len(fitness_values), tournament_size, replace=False)
        best_idx = max(participants, key=lambda i: fitness_values[i])
        return best_idx
    
    def select_elitism(self, fitness_values, elite_ratio=0.1):
        num_elite = max(1, int(len(fitness_values) * elite_ratio))
        elite_indices = np.argsort(fitness_values)[-num_elite:]
        return np.random.choice(elite_indices)
    
    def crossover(self, parent1, parent2, crossover_rate=0.7):
        if np.random.random() > crossover_rate:
            return parent1, parent2
        point = np.random.randint(1, self.chrom_length)
        child1 = parent1[:point] + parent2[point:]
        child2 = parent2[:point] + parent1[point:]
        return child1, child2
    
    def mutate(self, chrom):
        chrom_list = list(chrom)
        for i in range(self.chrom_length):
            if np.random.random() < self.mutation_rate:
                chrom_list[i] = '1' if chrom_list[i] == '0' else '0'
        return ''.join(chrom_list)
    
    def run(self):
        self.init_population()
        self.best_fitness_history = []
        self.avg_fitness_history = []
        
        for gen in range(self.generations):
            fitness_values = [self.fitness(self.decode(chrom)) for chrom in self.population]
            
            best_idx = np.argmax(fitness_values)
            best_fitness = fitness_values[best_idx]
            avg_fitness = np.mean(fitness_values)
            
            self.best_fitness_history.append(best_fitness)
            self.avg_fitness_history.append(avg_fitness)
            
            new_population = []
            
            if self.selection_strategy == 'elitism':
                num_elite = max(1, int(self.pop_size * 0.1))
                elite_indices = np.argsort(fitness_values)[-num_elite:]
                for idx in elite_indices:
                    new_population.append(self.population[idx])
            
            while len(new_population) < self.pop_size:
                if self.selection_strategy == 'roulette':
                    p1_idx = self.select_roulette(fitness_values)
                    p2_idx = self.select_roulette(fitness_values)
                    while p2_idx == p1_idx:
                        p2_idx = self.select_roulette(fitness_values)
                elif self.selection_strategy == 'tournament':
                    p1_idx = self.select_tournament(fitness_values)
                    p2_idx = self.select_tournament(fitness_values)
                    while p2_idx == p1_idx:
                        p2_idx = self.select_tournament(fitness_values)
                elif self.selection_strategy == 'elitism':
                    p1_idx = self.select_elitism(fitness_values)
                    p2_idx = self.select_elitism(fitness_values)
                    while p2_idx == p1_idx:
                        p2_idx = self.select_elitism(fitness_values)
                else:
                    p1_idx = self.select_roulette(fitness_values)
                    p2_idx = self.select_roulette(fitness_values)
                    while p2_idx == p1_idx:
                        p2_idx = self.select_roulette(fitness_values)
                
                parent1 = self.population[p1_idx]
                parent2 = self.population[p2_idx]
                
                child1, child2 = self.crossover(parent1, parent2)
                child1 = self.mutate(child1)
                child2 = self.mutate(child2)
                
                new_population.append(child1)
                if len(new_population) < self.pop_size:
                    new_population.append(child2)
            
            self.population = new_population[:self.pop_size]
        
        self.final_population = [self.decode(chrom) for chrom in self.population]
        
        fitness_values = [self.fitness(x) for x in self.final_population]
        best_idx = np.argmax(fitness_values)
        best_x = self.final_population[best_idx]
        best_fitness = fitness_values[best_idx]
        
        self.best_fitness_history.append(best_fitness)
        self.avg_fitness_history.append(np.mean(fitness_values))
        
        return {
            'best_x': best_x,
            'best_fitness': best_fitness,
            'best_fitness_history': self.best_fitness_history,
            'avg_fitness_history': self.avg_fitness_history,
            'final_population': self.final_population,
            'final_fitness': fitness_values
        }

def generate_function_curve():
    x = np.linspace(0, 2, 500)
    y = x * np.sin(10 * np.pi * x) + 1
    return x.tolist(), y.tolist()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/run_ga', methods=['POST'])
def run_ga():
    try:
        data = request.get_json()
        
        pop_size = int(data.get('pop_size', 50))
        mutation_rate = float(data.get('mutation_rate', 0.01))
        generations = int(data.get('generations', 100))
        selection_strategy = data.get('selection_strategy', 'roulette')
        
        pop_size = max(10, min(500, pop_size))
        mutation_rate = max(0.001, min(1.0, mutation_rate))
        generations = max(10, min(500, generations))
        
        ga = GeneticAlgorithm(
            pop_size=pop_size,
            mutation_rate=mutation_rate,
            generations=generations,
            selection_strategy=selection_strategy
        )
        
        result = ga.run()
        func_x, func_y = generate_function_curve()
        
        return jsonify({
            'success': True,
            'best_x': round(result['best_x'], 6),
            'best_fitness': round(result['best_fitness'], 6),
            'generations': list(range(1, generations + 2)),
            'best_fitness_history': result['best_fitness_history'],
            'avg_fitness_history': result['avg_fitness_history'],
            'final_population': result['final_population'],
            'final_fitness': result['final_fitness'],
            'function_x': func_x,
            'function_y': func_y
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
