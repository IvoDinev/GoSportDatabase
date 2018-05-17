const User = require('../../models/User');
const controller = {
    showHome(res) {
        res.send("Hello");
    },
    login(req, res, userRepository) {
        const username = req.body.username;
        const password = req.body.password;

        userRepository.findUserByParams({ username, password })
            .then((users) => {
                if (users.length == 0) {
                    res.send("Invalid username or password");
                    return;
                } else if (users.length > 1) {
                    res.send("System error: more than 1 user with the same name and pass");
                    return;
                } else {
                    res.send(users[0]);
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
        const user = new User(email, id, username, password, city);
        userRepository.findUserByParams({ username })
            .then((users) => {
                if (users.length > 0) {
                    res.send("Username Taken");
                    return;
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
    }
}
module.exports = controller;