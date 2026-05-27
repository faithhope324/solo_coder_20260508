from config import *

class Bait:
    def __init__(self, name, price, bite_bonus, rare_bonus, description):
        self.name = name
        self.price = price
        self.bite_bonus = bite_bonus
        self.rare_bonus = rare_bonus
        self.description = description

class Rod:
    def __init__(self, name, price, cast_power_bonus, qte_ease_bonus, description):
        self.name = name
        self.price = price
        self.cast_power_bonus = cast_power_bonus
        self.qte_ease_bonus = qte_ease_bonus
        self.description = description

class ShopSystem:
    def __init__(self):
        self.baits = [
            Bait("普通鱼饵", 10, 0.0, 0.0, "基础鱼饵，没有额外加成"),
            Bait("优质鱼饵", 30, 0.15, 0.05, "提高上钩概率"),
            Bait("特效鱼饵", 80, 0.25, 0.15, "大幅提高上钩概率和稀有鱼概率"),
            Bait("黄金鱼饵", 200, 0.4, 0.3, "顶级鱼饵，极大提高稀有鱼概率"),
        ]

        self.rods = [
            Rod("竹竿", 0, 0.0, 0.0, "初始鱼竿"),
            Rod("玻璃纤维竿", 150, 0.1, 0.1, "提高抛竿距离，降低QTE难度"),
            Rod("碳素竿", 400, 0.2, 0.2, "大幅提高抛竿距离，降低QTE难度"),
            Rod("黄金竿", 1000, 0.35, 0.35, "顶级鱼竿，全面提升"),
        ]

        self.current_bait = 0
        self.current_rod = 0
        self.bait_count = [10, 0, 0, 0]
        self.unlocked_rods = [True, False, False, False]
        self.money = 100

    def buy_bait(self, index):
        if index < 0 or index >= len(self.baits):
            return False
        if self.money >= self.baits[index].price:
            self.money -= self.baits[index].price
            self.bait_count[index] += 5
            return True
        return False

    def buy_rod(self, index):
        if index < 0 or index >= len(self.rods):
            return False
        if self.unlocked_rods[index]:
            return False
        if self.money >= self.rods[index].price:
            self.money -= self.rods[index].price
            self.unlocked_rods[index] = True
            return True
        return False

    def select_bait(self, index):
        if index < 0 or index >= len(self.baits):
            return False
        if self.bait_count[index] > 0:
            self.current_bait = index
            return True
        return False

    def select_rod(self, index):
        if index < 0 or index >= len(self.rods):
            return False
        if self.unlocked_rods[index]:
            self.current_rod = index
            return True
        return False

    def use_bait(self):
        if self.bait_count[self.current_bait] > 0:
            self.bait_count[self.current_bait] -= 1
            if self.bait_count[self.current_bait] == 0 and self.current_bait != 0:
                if self.bait_count[0] > 0:
                    self.current_bait = 0
            return True
        return False

    def has_bait(self):
        return self.bait_count[self.current_bait] > 0 or any(c > 0 for c in self.bait_count)

    def get_current_bait(self):
        return self.baits[self.current_bait]

    def get_current_rod(self):
        return self.rods[self.current_rod]

    def add_money(self, amount):
        self.money += amount

    def draw_shop(self, screen, font, large_font):
        pygame.draw.rect(screen, (50, 50, 70), (0, 0, SCREEN_WIDTH, SCREEN_HEIGHT))
        pygame.draw.rect(screen, (70, 70, 90), (50, 50, SCREEN_WIDTH - 100, SCREEN_HEIGHT - 100), border_radius=20)

        title = large_font.render("渔 具 商 店", True, WHITE)
        screen.blit(title, (SCREEN_WIDTH // 2 - title.get_width() // 2, 80))

        money_text = font.render(f"金币: {self.money}", True, YELLOW)
        screen.blit(money_text, (SCREEN_WIDTH - 200, 100))

        section_y = 180

        bait_title = font.render("鱼饵:", True, WHITE)
        screen.blit(bait_title, (100, section_y))
        section_y += 50

        for i, bait in enumerate(self.baits):
            color = GREEN if self.bait_count[i] > 0 else GRAY
            selected = " [已装备]" if i == self.current_bait and self.bait_count[i] > 0 else ""
            text = font.render(f"{i+1}. {bait.name} - {bait.price}金币 (库存:{self.bait_count[i]}){selected}", True, color)
            screen.blit(text, (120, section_y))
            desc = font.render(f"   {bait.description}", True, LIGHT_GRAY)
            screen.blit(desc, (120, section_y + 30))
            section_y += 70

        section_y += 20
        rod_title = font.render("鱼竿:", True, WHITE)
        screen.blit(rod_title, (100, section_y))
        section_y += 50

        for i, rod in enumerate(self.rods):
            if self.unlocked_rods[i]:
                color = GREEN
                status = " [已装备]" if i == self.current_rod else " [已拥有]"
                price_text = ""
            else:
                color = GRAY
                status = ""
                price_text = f" - {rod.price}金币"
            text = font.render(f"{chr(ord('a')+i).upper()}. {rod.name}{price_text}{status}", True, color)
            screen.blit(text, (120, section_y))
            desc = font.render(f"   {rod.description}", True, LIGHT_GRAY)
            screen.blit(desc, (120, section_y + 30))
            section_y += 70

        hint = font.render("按 1-4 购买/装备鱼饵 | 按 A-D 购买/装备鱼竿 | 按 ESC 返回游戏", True, YELLOW)
        screen.blit(hint, (SCREEN_WIDTH // 2 - hint.get_width() // 2, SCREEN_HEIGHT - 60))

    def draw_inventory(self, screen, font):
        current_bait = self.get_current_bait()
        bait_text = font.render(f"鱼饵: {current_bait.name} x{self.bait_count[self.current_bait]}", True, WHITE)
        screen.blit(bait_text, (20, 50))

        current_rod = self.get_current_rod()
        rod_text = font.render(f"鱼竿: {current_rod.name}", True, WHITE)
        screen.blit(rod_text, (20, 80))

        money_text = font.render(f"金币: {self.money}", True, YELLOW)
        screen.blit(money_text, (20, 110))
