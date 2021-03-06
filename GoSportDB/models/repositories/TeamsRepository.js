class TeamRepository {
    constructor(database, collectionName) {
        this.collectionName = collectionName;
        this.database = database;
    }
    getAllTeams() {
        return this.database.showAll(this.collectionName);
    }

    insertTeam(team) {
        return this.database.insert(this.collectionName, team);
    }

    findTeamById(id) {
        return this.database.find(this.collectionName, { id });
    }

    findTeamByParams(params) {
        return this.database.find(this.collectionName, params);
    }

    removeTeam(id) {
        return this.database.delete(this.collectionName, { id });
    }
}

module.exports = TeamRepository;