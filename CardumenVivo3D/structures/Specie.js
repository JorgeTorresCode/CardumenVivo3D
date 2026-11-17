class Specie {
    constructor(name) {
        this.name = name;
        this.beings = [];
    }
    addBeing(being) {
        this.beings.push(being);
    }
}
