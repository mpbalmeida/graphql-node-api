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
                            postId,
                            first: 2,
                            offset: 1
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
                            expect(commentList[0].comment).to.equal('Second comment');
                            expect(commentList[0]).to.have.keys(['comment', 'user', 'post']);
                            expect(parseInt(commentList[0].user.id)).to.equal(userId);
                            expect(parseInt(commentList[0].post.id)).to.equal(postId);
                        }).catch(handleError);
                });
            });
        });
    });
});