import db from "../../../src/models";
import {UserInstance} from "../../../src/models/UserModel";
import * as jwt from "jsonwebtoken";
import {JWT_SECRET} from "../../../src/utils/utils";
import {PostInstance} from "../../../src/models/PostModel";
import {CommentInstance} from "../../../src/models/CommentModel";
import {app, chai, expect, handleError} from "../../test-utils";

describe('Token', () => {
    let token: string;
    let userId: number;

    beforeEach(() => {
        return db.Comment.destroy({where: {}})
            .then((rows: number) => db.Post.destroy({where: {}}))
            .then((rows: number) => db.User.destroy({where: {}}))
            .then((rows: number) => db.User.create({
                    name: 'Token User',
                    email: 'token.user@email.com',
                    password: '1234'
                }
            )).catch(handleError);
    });

    describe('Mutations', () => {
        describe('application/json', () => {
            describe('createToken', () => {
                it ('should return a new valid token', () => {
                    const body = {
                        query: `
                            mutation createNewToken($email: String!, $password: String!) {
                                createToken(email: $email, password: $password) {
                                    token
                                }
                            }
                        `, variables: {
                            email: 'token.user@email.com',
                            password: '1234'
                        }
                    };

                    return chai.request(app)
                        .post('/graphql')
                        .set('content-type', 'application/json')
                        .send(JSON.stringify(body))
                        .then(res => {
                            expect(res.body.data).to.have.key('createToken');
                            expect(res.body.data.createToken).to.have.key('token');
                            expect(res.body.data.createToken).to.be.string;
                            expect(res.body.errors).to.be.undefined;
                        }).catch(handleError);
                });

                it ('should return an error if password is incorrect', () => {
                    const body = {
                        query: `
                            mutation createNewToken($email: String!, $password: String!) {
                                createToken(email: $email, password: $password) {
                                    token
                                }
                            }
                        `, variables: {
                            email: 'token.user@email.com',
                            password: '12345'
                        }
                    };

                    return chai.request(app)
                        .post('/graphql')
                        .set('content-type', 'application/json')
                        .send(JSON.stringify(body))
                        .then(res => {
                            expect(res.body).to.have.keys(['data', 'errors']);
                            expect(res.body.data).to.have.key('createToken');
                            expect(res.body.data.createToken).to.be.null;
                            expect(res.body.errors).to.be.an('array').with.length(1);
                            expect(res.body.errors[0].message).to.equal('Credentials are invalid!');
                        }).catch(handleError);
                });

                it ('should return an error when e-mail not exists', () => {
                    const body = {
                        query: `
                            mutation createNewToken($email: String!, $password: String!) {
                                createToken(email: $email, password: $password) {
                                    token
                                }
                            }
                        `, variables: {
                            email: 'token.user.incorrect@email.com',
                            password: '12345'
                        }
                    };

                    return chai.request(app)
                        .post('/graphql')
                        .set('content-type', 'application/json')
                        .send(JSON.stringify(body))
                        .then(res => {
                            expect(res.body).to.have.keys(['data', 'errors']);
                            expect(res.body.data).to.have.key('createToken');
                            expect(res.body.data.createToken).to.be.null;
                            expect(res.body.errors).to.be.an('array').with.length(1);
                            expect(res.body.errors[0].message).to.equal('Credentials are invalid!');
                        }).catch(handleError);
                });
            });
        });
    });
});