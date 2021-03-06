const Event = require('../../models/Event');
const Location = require('../../models/Location');
const datetime = require('../../models/DateTime');
const notificationService = require('../../models/services/notificationService');

const controller = {
    showEvents(req, res, eventRepository) {
        eventRepository.getAllEvents()
            .then((events) => {
                const now = new Date();

                const filteredEvents = events.filter((e) => {
                    const date = new Date(e.datetime.year,
                        e.datetime.month,
                        e.datetime.dayOfMonth,
                        e.datetime.hour,
                        e.datetime.minute, 0, 0);
                    return now.valueOf() <= date.valueOf();
                });
                const mappedEvents = filteredEvents.map((e) => {
                    return {
                        id: e.id,
                        name: e.name,
                        sport: e.sport,
                        datetime: e.datetime,
                        location: e.location,
                        admin: e.admin,
                        neededPlayers: e.neededPlayers,
                        players: e.players,
                        teamIds: e.teamIds
                    }
                });
                res.send(mappedEvents);
                return;
            })
            .catch(() => {
                res.send("Error");
                return;
            });
    },
    showEvent(req, res, eventRepository) {
        const id = +req.params.id;
        eventRepository.findEventByParams({ id }).then((events) => {
            if (events.length < 1) {
                res.send("No event with id: " + id);
                return;
            } else if (events.length > 1) {
                res.send("More than one event with id: " + id);
                return;
            }

            const event = {
                id: events[0].id,
                name: events[0].name,
                sport: events[0].sport,
                datetime: events[0].datetime,
                location: events[0].location,
                admin: events[0].admin,
                neededPlayers: events[0].neededPlayers,
                players: events[0].players,
            }
            res.send(event);
        });
        //const events = await Promise.resolve(eventRepository.findEventByParams.bind(eventRepository));
    },
    createEvent(req, res, eventRepository, userRepository, teamRepository, idGenerator) {
        const id = idGenerator.getEventId();
        const name = req.body.name;
        const sport = req.body.sport;
        const year = +req.body.year;
        const month = +req.body.month;
        const day = +req.body.day;
        const hours = +req.body.hours;
        const minutes = +req.body.minutes;
        datetime.year = year;
        datetime.month = month;
        datetime.dayOfMonth = day;
        datetime.hour = hours;
        datetime.minute = minutes;
        const longitude = +req.body.longitude;
        const latitude = +req.body.latitude;
        const address = req.body.address;
        const location = new Location(longitude, latitude, address);
        const adminId = +req.body.adminId;
        const neededPlayers = +req.body.neededPlayers;
        let teamIds = req.body.teamIds;
        if (!teamIds) {
            teamIds = null;
        }
        const players = [];

        userRepository.findUserById(adminId).then((foundUsers) => {
            if (foundUsers.length !== 1) {
                res.send("Problem with finding user");
                return;
            }

            const user = foundUsers[0];

            const mappedUser = {
                id: user.id,
                email: user.email,
                username: user.username,
                city: user.city,
                profileImg: user.profileImg,
                token: user.token
            };

            players.push(mappedUser);

            const event = new Event(id, name, sport, datetime,
                location, mappedUser, neededPlayers,
                players, teamIds);

            eventRepository.findEventByParams({ location, sport, datetime })
                .then((events) => {
                    if (events.length > 0) {
                        res.send("Event already exists");
                        return;
                    }

                    user.events.push(event);
                    userRepository.removeUser(user.id).then(() => {
                        userRepository.insertUser(user).then(() => {
                            eventRepository.insertEvent(event)
                                .then(() => {
                                    if (teamIds) {
                                        this.notifyPlayersFromTeams(event, teamRepository, teamIds);
                                    }
                                    res.send(event);
                                    return;
                                })
                                .catch(() => {
                                    res.send("Error");
                                    return;
                                });
                        });
                    });
                });
        });
    },
    notifyPlayersFromTeams(event, teamRepository, teamIds) {
        teamRepository.getAllTeams().then((teams) => {
            const filteredTeams = teams.filter(function(t) {
                const foundTeam = teamIds.find((id) => id === t.id);
                if (foundTeam) {
                    return true;
                }

                return false;
            });
            const adminToken = event.admin.token;

            const playersTokens = [];
            filteredTeams.forEach((t) => {
                const players = t.players;
                players.map(p => p.token).forEach((t) => {
                    if (playersTokens.indexOf(t) < 0 && adminToken !== t && t) {
                        playersTokens.push(t);
                    }
                });
            });

            notificationService.createAndSendMessages(event.sport,
                event.admin.username + " Ви покани да се присъедините", playersTokens);
        });
    },
    addUserToEvent(req, res, eventRepository, userRepository, teamRepository) {
        const userId = +req.body.userId;
        const eventId = +req.params.id;

        userRepository.findUserById(userId).then((foundUsers) => {
            if (foundUsers.length !== 1) {
                res.send("Problem with finding user");
                return;
            }
            const user = foundUsers[0];

            const mappedUser = {
                id: user.id,
                email: user.email,
                username: user.username,
                city: user.city,
                profileImg: user.profileImg,
                password: user.password,
                token: user.token
            };

            eventRepository.findEventByParams({ id: eventId }).then((events) => {
                if (events.length == 0) {
                    res.send("No event with id: " + eventId);
                    return;
                } else if (events.length > 1) {
                    res.send("More than one event with id: " + eventId);
                    return;
                }

                const event = events[0];
                if (!event.teamIds || event.teamIds.length === 0) {
                    this._addPlayerToEvent(req, res, eventId,
                        userId, userRepository, eventRepository,
                        mappedUser, event, user, null);
                } else {
                    teamRepository.getAllTeams().then((teams) => {
                        const playerIds = [].concat(...(teams.filter((t) => {
                                    return event.teamIds.find((i) => i === t.id);
                                }))
                                .map((t) => t.players))
                            .map((p) => p.id).filter(function(value, index, self) {
                                return self.indexOf(value) === index;
                            });
                        // Calls with parameter for ids of players who can participate
                        this._addPlayerToEvent(req, res, eventId,
                            userId, userRepository, eventRepository,
                            mappedUser, event, user, playerIds);
                    });
                }
            });
        });

    },

    _addPlayerToEvent(req, res, eventId,
        userId, userRepository, eventRepository,
        mappedUser, event, user, playerIds) {
        if (playerIds && (playerIds.indexOf(mappedUser.id) < 0)) {
            res.send('Събитието е ограничено само за някои отбори');
            return;
        }
        if (event.neededPlayers == -1 ||
            event.players.length < event.neededPlayers) {
            for (let i = 0; i < event.players.length; i += 1) {
                if (event.players[i].id === userId) {
                    res.send('Already in the event');
                    return;
                }
            }
            event.players.push(mappedUser);
            eventRepository.removeEvent(eventId).then(() => {
                eventRepository.insertEvent(event).then(() => {
                    user.events.push(event);
                    userRepository.removeUser(user.id).then(() => {
                        userRepository.insertUser(user).then(() => {
                            this.notifyPlayersForNewPlayer(event, user);
                            res.send(event);
                            return;
                        });
                    });
                });
            });
        } else {
            res.send('Няма повече ограничени места');
        }
    },
    notifyPlayersForNewPlayer(event, player) {
        const mappedTokens = event.players.map((m) => m.token)
            .filter(function(value, index, self) {
                return self.indexOf(value) === index;
            }).filter((token) => { return (token !== player.token && token); });
        notificationService.createAndSendMessages(event.name,
            player.username + ' се присъедини към събитието.', mappedTokens);
    },
    deleteEvent(req, res, eventRepository) {
        eventRepository.removeEvent(id)
            .then(() => {
                res.send("Event deleted");
                return;
            });
    },

    async removeUserFromEvent(req, res, eventRepository) {
        const userId = +req.body.userId;
        const eventId = +req.params.id;
        const events = await eventRepository.findEventById(eventId);
        if (events.length !== 1) {
            res.send('More or less than one event found.');
        }

        const event = events[0];
        const filteredPlayers = event.players.filter(function(p) { return p.id !== userId });
        event.players = filteredPlayers;
        await eventRepository.removeEvent(eventId);
        await eventRepository.insertEvent(event);
        res.send(event);
    }
}

module.exports = controller;