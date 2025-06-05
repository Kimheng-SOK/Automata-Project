// Data Storage Class
class AutomataStorage {
    static STORAGE_KEY = 'finiteAutomata';

    static saveAutomata(name, automata) {
        const savedAutomata = this.getAllAutomata();
        savedAutomata[name] = automata.toJSON();
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(savedAutomata));
    }

    static getAllAutomata() {
        const data = localStorage.getItem(this.STORAGE_KEY);
        return data ? JSON.parse(data) : {};
    }

    static getAutomata(name) {
        const all = this.getAllAutomata();
        return all[name] ? FiniteAutomaton.fromJSON(all[name]) : null;
    }

    static deleteAutomata(name) {
        const savedAutomata = this.getAllAutomata();
        delete savedAutomata[name];
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(savedAutomata));
    }

    static getAutomataNames() {
        return Object.keys(this.getAllAutomata());
    }

    static deleteAllAutomata() {
        localStorage.removeItem(this.STORAGE_KEY);
    }

    static exportAutomata(name) {
        const all = this.getAllAutomata();
        return all[name] ? JSON.stringify(all[name], null, 2) : null;
    }

    static importAutomata(name, jsonData) {
        try {
            const data = JSON.parse(jsonData);
            if (data.states && data.transitions) {
                const savedAutomata = this.getAllAutomata();
                savedAutomata[name] = data;
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(savedAutomata));
                return true;
            }
        } catch (e) {
            console.error("Invalid automata data", e);
        }
        return false;
    }
}