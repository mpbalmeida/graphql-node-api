import db from "../../../src/models";
import {UserInstance} from "../../../src/models/UserModel";
import * as jwt from "jsonwebtoken";
import {JWT_SECRET} from "../../../src/utils/utils";
import {PostInstance} from "../../../src/models/PostModel";
import {CommentInstance} from "../../../src/models/CommentModel";
import * as chai from "chai";
import app from "../../../src/app";
import {expect, handleError} from "../../test-utils";

describe('Comment', () => {
    let token: string;
    let userId: number;
    let postId: number;
    let commentId: number;

    beforeEach(() => {
        return db.Comment.destroy({where: {}})
            .then((rows: number) => db.Post.destroy({where: {}}))
            .then((rows: number) => db.User.destroy({where: {}}))
            .then((rows: number) => db.User.create({
                    name: 'Comment User',
                    email: 'comment.user@email.com',
                    password: '1234'
                }
            )).then((user: UserInstance) => {
                userId = user.get('id');
                const payload = {sub: userId};
                token = jwt.sign(payload, JWT_SECRET);

                return db.Post.create({
                        title: 'First post',
                        content: 'First post content',
                        author: userId,
                        photo: 'some_photo'
                });
            }).then((post: PostInstance) => {
                postId = post.get('id');

                return db.Comment.bulkCreate([
                    {
                        comment: 'First comment',
                        post: postId,
                        user: userId,
                    },
                    {
                        comment: 'Second comment',
                        post: postId,
                        user: userId,
                    },
                    {
                        comment: 'Third comment',
                        post: postId,
                        user: userId,
                    }
                ]).then((comments: CommentInstance[]) => {
                    commentId = comments[0].get('id');
                });
            });
    });

    describe('Queries', () => {
        describe('application/json', () => {
            describe('commentsByPost', () => {
                it('should return a list of Comments', () => {
                    const body = {
                        query: `
                            query getCommentsByPostList($postId: ID!, $first: Int, $offset: Int){
                                commentsByPost(postId: $postId, first: $first, offset: $offset) {
                                    comment
                                    user {
                                        id
                                    }
                                    post {
                                        id
                                    }
                                }
                            }
                        `, variables: {
                            postId
                        }
                    };

                    return chai.request(app)
                        .post('/graphql')
                        .set('content-type', 'application/json')
                        .send(JSON.stringify(body))
                        .then(res => {
                            const commentList = res.body.data.commentsByPost;
                            expect(res.body.data).to.be.an('object');
                            expect(commentList).to.be.an('array');
                            expect(commentList[0]).to.not.have.keys(['id', 'createdAt', 'updatedAt']);
                            expect(commentList[0].comment).to.equal('First comment');
                            expect(commentList[0]).to.have.keys(['comment', 'user', 'post']);
                            expect(parseInt(commentList[0].user.id)).to.equal(userId);
                            expect(parseInt(commentList[0].post.id)).to.equal(postId);
                        }).catch(handleError);
                });


            });
        });
    });

    describe('Mutations', () => {
        describe('application/json', () => {
            describe('createComment', () => {
                it('should create a new Comment', () => {
                    const body = {
                        query: `
                            mutation createNewComment($input: CommentInput!){
                                createComment(input: $input) {
                                    id
                                    comment
                                    user {
                                        id
                                        name
                                    }
                                    post {
                                        id
                                        title
                                    }
                                }
                            }
                        `, variables: {
                            input: {
                                comment: 'Fourth comment',
                                post: postId
                            }
                        }
                    };

                    return chai.request(app)
                        .post('/graphql')
                        .set('content-type', 'application/json')
                        .set('authorization', `Bearer ${token}`)
                        .send(JSON.stringify(body))
                        .then(res => {
                            const comment = res.body.data.createComment;
                            expect(comment).to.be.an('object');
                            expect(comment).to.have.keys(['id', 'comment', 'user', 'post']);
                            expect(comment.comment).to.equal('Fourth comment');
                            expect(parseInt(comment.user.id)).to.equal(userId);
                            expect(parseInt(comment.post.id)).to.equal(postId);
                        }).catch(handleError);
                });
            });

            describe('updateComment', () => {
                it('should update a Comment', () => {
                    const body = {
                        query: `
                            mutation updateComment($id: ID!, $input: CommentInput!){
                                updateComment(id: $id, input: $input) {
                                    comment
                                    user {
                                        id
                                        name
                                    }
                                    post {
                                        id
                                        title
                                    }
                                }
                            }
                        `, variables: {
                            id: commentId,
                            input: {
                                comment: 'Updated comment',
                                post: postId
                            }
                        }
                    };

                    return chai.request(app)
                        .post('/graphql')
                        .set('content-type', 'application/json')
                        .set('authorization', `Bearer ${token}`)
                        .send(JSON.stringify(body))
                        .then(res => {
                            const comment = res.body.data.updateComment;
                            expect(comment).to.be.an('object');
                            expect(comment).to.have.keys(['comment', 'user', 'post']);
                            expect(comment.comment).to.equal('Updated comment');
                            expect(parseInt(comment.user.id)).to.equal(userId);
                            expect(parseInt(comment.post.id)).to.equal(postId);
                        }).catch(handleError);
                });
            });

            describe('deleteComment', () => {
                it('should delete a Comment', () => {
                    const body = {
                        query: `
                            mutation deleteComment($id: ID!){
                                deleteComment(id: $id)
                            }
                        `, variables: {
                            id: commentId
                        }
                    };

                    return chai.request(app)
                        .post('/graphql')
                        .set('content-type', 'application/json')
                        .set('authorization', `Bearer ${token}`)
                        .send(JSON.stringify(body))
                        .then(res => {
                            expect(res.body.data).to.have.key('deleteComment');
                            expect(res.body.data.deleteComment).to.be.true;
                        }).catch(handleError);
                });
            });
        });
    });
});