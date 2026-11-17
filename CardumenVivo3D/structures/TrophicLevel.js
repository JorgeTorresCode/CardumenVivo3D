class TrophicLevel {
    constructor(level) {
        this.level = level;
        this.especies = [];
    }
    addSpecie(specie) {
        this.especies.push(specie);
    }
}
