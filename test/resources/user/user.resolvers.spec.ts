import * as jwt from 'jsonwebtoken';
import {app, chai, db, expect, handleError} from './../../test-utils';
import {UserInstance} from "../../../src/models/UserModel";
import {JWT_SECRET} from "../../../src/utils/utils";

describe('User', () => {

    let token: string;
    let userId: number;

    beforeEach(() => {
        return db.Comment.destroy({where: {}})
            .then((rows: number) => db.Post.destroy({where: {}}))
            .then((rows: number) => db.User.destroy({where: {}}))
            .then((rows: number) => db.User.bulkCreate([
                {
                    name: 'Test User',
                    email: 'test.user@email.com',
                    password: '1234'
                },
                {
                    name: 'Test User2',
                    email: 'test.user2@email.com',
                    password: '4321'
                },
                {
                    name: 'Test User3',
                    email: 'test.user3@email.com',
                    password: '3333'
                }
                ]
            )).then((users: UserInstance[]) => {
                userId = users[0].get('id');
                const payload = {sub: userId};
                token = jwt.sign(payload, JWT_SECRET);
            });
    });

    describe('Queries', () => {
        describe('application/json', () => {

            describe('users', () => {

                it('should return a list of Users', () => {

                    const body = {
                        query: `
                            query {
                                users {
                                    name
                                    email
                                }
                            }
                        `
                    };

                    return chai.request(app)
                        .post('/graphql')
                        .set('content-type', 'application/json')
                        .send(JSON.stringify(body))
                        .then(res => {
                            const userList = res.body.data.users;
                            expect(res.body.data).to.be.an('object');
                            expect(userList).to.be.an('array');
                            expect(userList[0]).to.not.have.keys(['id', 'photo', 'createdAt', 'updatedAt', 'posts']);
                            expect(userList[0].name).to.equal('Test User');
                            expect(userList[0]).to.have.keys(['name', 'email']);
                        }).catch(handleError);
                });

                it('should paginate a list of Users', () => {

                    const body = {
                        query: `
                            query getUsersList($first: Int, $offset: Int){
                                users(first: $first, offset: $offset) {
                                    name
                                    email
                                    createdAt
                                }
                            }
                        `,
                        variables: {
                            first: 2,
                            offset: 1
                        }
                    };

                    return chai.request(app)
                        .post('/graphql')
                        .set('content-type', 'application/json')
                        .send(JSON.stringify(body))
                        .then(res => {
                            const userList = res.body.data.users;
                            expect(res.body.data).to.be.an('object');
                            expect(userList).to.be.an('array').of.length(2);
                            expect(userList[0]).to.not.have.keys(['id', 'photo', 'updatedAt', 'posts']);
                            expect(userList[0]).to.have.keys(['name', 'email', 'createdAt']);
                        }).catch(handleError);
                });

            });

            describe('user', () => {
                it('should return a single User', () => {

                    const body = {
                        query: `
                            query getSingleUser($id: ID!){
                                user(id: $id) {
                                    name
                                    email
                                }
                            }
                        `,
                        variables: {
                            id : userId
                        }
                    };

                    return chai.request(app)
                        .post('/graphql')
                        .set('content-type', 'application/json')
                        .send(JSON.stringify(body))
                        .then(res => {
                            const singleUser = res.body.data.user;
                            expect(res.body.data).to.be.an('object');
                            expect(singleUser).to.be.an('object');
                            expect(singleUser.email).to.equal('test.user@email.com');
                        }).catch(handleError);
                });

                it('should error if user does not exists', () => {

                    const body = {
                        query: `
                            query getSingleUser($id: ID!){
                                user(id: $id) {
                                    name
                                    email
                                }
                            }
                        `,
                        variables: {
                            id : -1
                        }
                    };

                    return chai.request(app)
                        .post('/graphql')
                        .set('content-type', 'application/json')
                        .send(JSON.stringify(body))
                        .then(res => {
                            expect(res.body.data.user).to.be.null;
                            expect(res.body.errors).to.be.an('array');
                            expect(res.body).to.have.keys(['data', 'errors']);
                            expect(res.body.errors[0].message).to.equal('Error: User with id -1 not found!');
                        }).catch(handleError);
                });
            });
        });
    });

    describe('Mutations', () => {
        describe('application/json', () => {
            describe('createUser', () => {
                it('should create new User', () => {

                    let body = {
                        query: `
                            mutation createNewUser($input: UserCreateInput!) {
                                createUser(input: $input) {
                                    id
                                    email
                                    name
                                }
                            }
                        `,
                        variables: {
                            input: {
                                name: 'Test',
                                email: 'test@email.com',
                                password: '1234'
                            }
                        }
                    };

                    return chai.request(app)
                        .post('/graphql')
                        .set('content-type', 'application/json')
                        .send(JSON.stringify(body))
                        .then(res => {
                            const createdUser = res.body.data.createUser;
                            expect(createdUser).to.be.an('object');
                            expect(createdUser.name).to.equal('Test');
                            expect(createdUser.email).to.equal('test@email.com');
                            expect(parseInt(createdUser.id)).to.be.a('number');
                        }).catch(handleError);
                });
            });

            describe('updateUser', () => {
                it('should update an existing User', () => {

                    let body = {
                        query: `
                            mutation updateExistingUser($input: UserUpdateInput!) {
                                updateUser(input: $input) {
                                    email
                                    name
                                    photo
                                }
                            }
                        `,
                        variables: {
                            input: {
                                name: 'Updated',
                                email: 'updated@email.com',
                                photo: 'photostring'
                            }
                        }
                    };

                    return chai.request(app)
                        .post('/graphql')
                        .set('content-type', 'application/json')
                        .set('authorization', `Bearer ${token}`)
                        .send(JSON.stringify(body))
                        .then(res => {
                            const updatedUser = res.body.data.updateUser;
                            expect(updatedUser).to.be.an('object');
                            expect(updatedUser.name).to.equal('Updated');
                            expect(updatedUser.email).to.equal('updated@email.com');
                        }).catch(handleError);
                });

                it('should block operation if token is invalid', () => {

                    let body = {
                        query: `
                            mutation updateExistingUser($input: UserUpdateInput!) {
                                updateUser(input: $input) {
                                    email
                                    name
                                    photo
                                }
                            }
                        `,
                        variables: {
                            input: {
                                name: 'Updated',
                                email: 'updated@email.com',
                                photo: 'photostring'
                            }
                        }
                    };

                    return chai.request(app)
                        .post('/graphql')
                        .set('content-type', 'application/json')
                        .set('authorization', `Bearer invalidtoken`)
                        .send(JSON.stringify(body))
                        .then(res => {
                            expect(res.body.data.updateUser).to.be.null;
                            expect(res.body).to.have.keys(['data', 'errors']);
                            expect(res.body.errors).to.be.an('array');
                            expect(res.body.errors[0].message).to.equal('JsonWebTokenError: jwt malformed');
                        }).catch(handleError);
                });
            });

            describe('updateUserPassword', () => {
                it('should update the password of an existing User', () => {

                    let body = {
                        query: `
                            mutation updateUserPassword($input: UserUpdatePasswordInput!) {
                                updateUserPassword(input: $input)
                            }
                        `,
                        variables: {
                            input: {
                                password: 'peter123'
                            }
                        }
                    };

                    return chai.request(app)
                        .post('/graphql')
                        .set('content-type', 'application/json')
                        .set('authorization', `Bearer ${token}`)
                        .send(JSON.stringify(body))
                        .then(res => {
                            expect(res.body.data.updateUserPassword).to.be.true;
                        }).catch(handleError);
                });
            });

            describe('deleteUser', () => {
                it('should delete an existing User', () => {

                    let body = {
                        query: `
                            mutation {
                                deleteUser
                            }
                        `
                    };

                    return chai.request(app)
                        .post('/graphql')
                        .set('content-type', 'application/json')
                        .set('authorization', `Bearer ${token}`)
                        .send(JSON.stringify(body))
                        .then(res => {
                            expect(res.body.data.deleteUser).to.be.true;
                        }).catch(handleError);
                });
            });
        }) ;
    });
});