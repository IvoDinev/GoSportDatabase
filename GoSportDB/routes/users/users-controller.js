const User = require('../../models/User');
const controller = {
    showHome(res) {
        res.send(`
        <h1 style='text-align: center; border: 3px solid red; color: black;'>
            The official api of GoSport
        </h1>
        `);
    },
    login(req, res, userRepository) {
        const username = req.body.username;
        const password = req.body.password;
        const token = req.body.token;

        userRepository.findUserByParams({ username, password })
            .then((users) => {
                if (users.length == 0) {
                    res.send("Invalid username or password");
                    return;
                } else if (users.length > 1) {
                    res.send("System error: more than 1 user with the same name and pass");
                    return;
                } else {
                    const user = users[0];
                    if (token && user.token !== token) {
                        user.token = token;
                        userRepository.removeUser(user.id).then(() => {
                            userRepository.insertUser(user).then(() => {
                                res.send(user);
                                return;
                            });
                        })
                    }
                    res.send(user);
                    return;
                }
            })
            .catch(() => {
                res.send("Error occured");
                return;
            });
    },
    register(req, res, userRepository, idGenerator) {
        const email = req.body.email;
        const id = idGenerator.getUserId();
        const username = req.body.username;
        const password = req.body.password;
        const city = req.body.city;
        const profileImg = req.body.profileImg;
        const token = req.body.token;
        let fileName;
        if (!profileImg) {
            fileName = 'default' + '.jpg';
        } else {
            fileName = username + '.jpg';
        }
        const pathToProfile = "/static/images/profile/" + fileName;
        const user = new User(email, id, username, password, city, pathToProfile, [], [], token);
        userRepository.findUserByParams({ email })
            .then((users) => {
                if (users.length > 0) {
                    res.send("Username Taken");
                    return;
                }

                if (profileImg) {
                    this.uploadPicture(profileImg, fileName);
                }
                userRepository.insertUser(user)
                    .then(() => {
                        res.send(user);
                        return;
                    })
                    .catch(() => {
                        res.send("Error");
                        return;
                    });
            })

    },
    facebookLogin(req, res, userRepository, idGenerator) {
        const email = req.body.email;
        const id = idGenerator.getUserId();
        const username = req.body.username;
        const profileImg = req.body.pictureUrl;
        const token = req.body.token;
        userRepository.findUserByParams({ email }).then((users) => {
            if (users.length > 1) {
                res.send('Error: More than one user with this username.');
                return
            }
            if (users.length === 0) {
                const user = new User(email, id, username, null, null, profileImg, [], [], token);
                userRepository.insertUser(user)
                    .then(() => {
                        res.send(user);
                        return;
                    })
                    .catch(() => {
                        res.send("Error");
                        return;
                    });
            } else if (users.length === 1) {
                const user = users[0];
                if (token && user.token !== token) {
                    user.token = token;
                    userRepository.removeUser(user.id).then(() => {
                        userRepository.insertUser(user).then(() => {
                            res.send(user);
                            return;
                        });
                    })
                }
                res.send(user);
                return;
            }
        });
    },
    uploadPicture(profileImg, fileName) {
        const pathToProfile = "/static/images/profile/";

        const indexOfEndForFilePath = __filename.indexOf('/routes');

        const fullPath = __filename.slice(0, indexOfEndForFilePath) + pathToProfile;

        require("fs").writeFile(fullPath + fileName, profileImg, 'base64', function(err) {
            if (err) {
                console.log(err);
            }
        });
    },
    showUsers(req, res, userRepository) {
        userRepository.getAllUsers()
            .then((users) => {
                res.send(users);
                return;
            })
            .catch(() => {
                res.send("Error");
                return;
            });
    },
    showUser(req, res, userRepository) {
        const id = +req.params.id;
        userRepository.findUserById(id).then((foundUsers) => {
            if (foundUsers.length !== 1) {
                res.send('No users with this id found');
                return;
            }
            res.send(foundUsers[0]);
        });
    },

    showUserTeams(req, res, userRepository) {
        const id = +req.params.id;
        userRepository.findUserById(id).then((foundUsers) => {
            if (foundUsers.length !== 1) {
                res.send('No users with this id found');
                return;
            }
            res.send(foundUsers[0].teams.map((t) => { return { id: t.id, name: t.name } }));
        });
    }
}
module.exports = controller;