# Campaign Resolution and Turn State Machine

## Purpose
Define macro (campaign) and micro (battle) loops, and global win conditions.

---

## Global Win Condition
- Capture the opponent’s **Capital node**

---

## Campaign Turn Flow
1. **Target Selection:** Active Player selects an adjacent enemy or neutral node  
2. **Phase Transition:** Both clients enter **Battle Phase**

---

## Battle Phase Initialization
1. **Loadout Phase:** Spend **Void-Scrap** to equip **Tactical Items**  
2. **Initiative Roll:**  
   - Both players roll one die  
   - Highest roll takes first turn  
   - Resulting dice values are used for first movement  

---

## Micro Turn Loop (Active Player)

1. **Upkeep**  
   - Resolve active modifiers  
   - Expire durations  

2. **Pre-Roll Actions (Optional)**  
   - Execute **Pre-Move** items  
   - Invoke **Escalation Protocol**  

3. **Roll Dice**  
   - Generate two integers (1–6)  

4. **Post-Roll Actions (Optional)**  
   - Execute **Reactive** items  

5. **Movement**  
   - Apply standard Backgammon validation rules  

6. **Win Check**  
   - If all 15 Legions complete **Orbital Evacuation**, trigger victory  

7. **Pass Turn**  
   - Transfer Active Player status  
