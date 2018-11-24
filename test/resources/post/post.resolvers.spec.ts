import db from "../../../src/models";
import {UserInstance} from "../../../src/models/UserModel";
import * as jwt from "jsonwebtoken";
import {JWT_SECRET} from "../../../src/utils/utils";
import {PostInstance} from "../../../src/models/PostModel";
import * as chai from "chai";
import app from "../../../src/app";
import {expect, handleError} from "../../test-utils";

describe('Post', () => {
    let token: string;
    let userId: number;
    let postId: number;

    beforeEach(() => {
        return db.Comment.destroy({where: {}})
            .then((rows: number) => db.Post.destroy({where: {}}))
            .then((rows: number) => db.User.destroy({where: {}}))
            .then((rows: number) => db.User.create({
                    name: 'Rocker',
                    email: 'rocket@email.com',
                    password: '1234'
                }
            )).then((user: UserInstance) => {
                userId = user.get('id');
                const payload = {sub: userId};
                token = jwt.sign(payload, JWT_SECRET);

                return db.Post.bulkCreate([
                    {
                        title: 'First post',
                        content: 'First post content',
                        author: userId,
                        photo: 'some_photo'
                    },
                    {
                        title: 'Second post',
                        content: 'Second post content',
                        author: userId,
                        photo: 'some_photo2'
                    },
                    {
                        title: 'Third post',
                        content: 'Third post content',
                        author: userId,
                        photo: 'some_photo3'
                    }
                ]);
            }).then((posts: PostInstance[]) => {
                postId = posts[0].get('id');
            });
    });

    describe('Queries', () => {
       describe('application/json', () => {
          describe('posts', () => {
             it('should return a list of Posts', () => {
                 const body = {
                     query: `
                            query {
                                posts {
                                    title
                                    content
                                    photo
                                }
                            }
                        `
                 };

                 return chai.request(app)
                     .post('/graphql')
                     .set('content-type', 'application/json')
                     .send(JSON.stringify(body))
                     .then(res => {
                         const postList = res.body.data.posts;
                         expect(res.body.data).to.be.an('object');
                         expect(postList).to.be.an('array');
                         expect(postList[0]).to.not.have.keys(['id', 'author', 'createdAt', 'updatedAt']);
                         expect(postList[0].title).to.equal('First post');
                         expect(postList[0]).to.have.keys(['title', 'content', 'photo']);
                     }).catch(handleError);
             });
          });

           describe('post', () => {
               it('should return a single Post with it author\'s', () => {
                   const body = {
                       query: `
                            query getPost($id: ID!) {
                                post(id: $id) {
                                    title
                                    author {
                                        name
                                        email
                                    }
                                    comments {
                                        comment
                                    }
                                }
                            }
                        `,
                       variables: {
                           id: postId
                       }
                   };

                   return chai.request(app)
                       .post('/graphql')
                       .set('content-type', 'application/json')
                       .send(JSON.stringify(body))
                       .then(res => {
                           const post = res.body.data.post;
                           expect(res.body.data).to.have.key('post');
                           expect(post).to.be.an('object');
                           expect(post).to.have.keys(['title', 'author', 'comments']);
                           expect(post.title).to.equal('First post');
                           expect(post.author).to.have.keys(['name', 'email']);
                       }).catch(handleError);
               });
           });
       });

       describe('application/graphql', () => {
           describe('post', () => {
               it('should return a list of Posts', () => {
                   const query = `
                            query {
                                posts {
                                    title
                                    content
                                    photo
                                }
                            }
                        `;

                   return chai.request(app)
                       .post('/graphql')
                       .set('content-type', 'application/graphql')
                       .send(query)
                       .then(res => {
                           const postList = res.body.data.posts;
                           expect(res.body.data).to.be.an('object');
                           expect(postList).to.be.an('array');
                           expect(postList[0]).to.not.have.keys(['id', 'author', 'createdAt', 'updatedAt']);
                           expect(postList[0].title).to.equal('First post');
                           expect(postList[0]).to.have.keys(['title', 'content', 'photo']);
                       }).catch(handleError);
               });

               it('should paginate a list of Posts', () => {
                   const query = `
                            query getPostsList($first: Int, $offset: Int){
                                posts(first: $first, offset: $offset) {
                                    title
                                    content
                                    photo
                                }
                            }
                        `;

                   return chai.request(app)
                       .post('/graphql')
                       .set('content-type', 'application/graphql')
                       .send(query)
                       .query({
                           variables: JSON.stringify({
                               first: 2,
                               offset: 1
                           })
                       })
                       .then(res => {
                           const postList = res.body.data.posts;
                           expect(res.body.data).to.be.an('object');
                           expect(postList).to.be.an('array').with.length(2);
                           expect(postList[0]).to.not.have.keys(['id', 'author', 'createdAt', 'updatedAt']);
                           expect(postList[0].title).to.equal('Second post');
                           expect(postList[0]).to.have.keys(['title', 'content', 'photo']);
                       }).catch(handleError);
               });
           });
       });
    });

    describe('Mutations', () => {
        describe('application/json', () => {
            describe('createPost', () => {
                it('should create a new Post', () => {
                    const body = {
                        query: `
                            mutation createNewPost($input: PostInput!){
                                createPost(input: $input) {
                                    id
                                    title
                                    author {
                                        id
                                        name
                                        email
                                    }
                                }
                            }
                        `, variables: {
                            input: {
                                title: 'Fourth post',
                                content: 'Fourth content',
                                photo: 'some_photo'
                            }
                        }
                    };

                    return chai.request(app)
                        .post('/graphql')
                        .set('content-type', 'application/json')
                        .set('authorization', `Bearer ${token}`)
                        .send(JSON.stringify(body))
                        .then(res => {
                            const post = res.body.data.createPost;
                            expect(post).to.be.an('object');
                            expect(post).to.have.keys(['id', 'title', 'author']);
                            expect(post.title).to.equal('Fourth post');
                            expect(parseInt(post.author.id)).to.equal(userId);
                        }).catch(handleError);
                });
            });

            describe('updatePost', () => {
                it('should update a Post', () => {
                    const body = {
                        query: `
                            mutation updatePost($id: ID!, $input: PostInput!){
                                updatePost(id: $id, input: $input) {
                                    title
                                    content
                                    photo
                                }
                            }
                        `, variables: {
                            id: postId,
                            input: {
                                title: 'Post alterado',
                                content: 'Content alterado',
                                photo: 'photo_alterado'
                            }
                        }
                    };

                    return chai.request(app)
                        .post('/graphql')
                        .set('content-type', 'application/json')
                        .set('authorization', `Bearer ${token}`)
                        .send(JSON.stringify(body))
                        .then(res => {
                            const post = res.body.data.updatePost;
                            expect(post).to.be.an('object');
                            expect(post).to.have.keys(['content', 'title', 'photo']);
                            expect(post.title).to.equal('Post alterado');
                            expect(post.content).to.equal('Content alterado');
                            expect(post.photo).to.equal('photo_alterado');
                        }).catch(handleError);
                });
            });

            describe('deletePost', () => {
                it('should delete a Post', () => {
                    const body = {
                        query: `
                            mutation deletePost($id: ID!){
                                deletePost(id: $id)
                            }
                        `, variables: {
                            id: postId
                        }
                    };

                    return chai.request(app)
                        .post('/graphql')
                        .set('content-type', 'application/json')
                        .set('authorization', `Bearer ${token}`)
                        .send(JSON.stringify(body))
                        .then(res => {
                            expect(res.body.data).to.have.key('deletePost');
                            expect(res.body.data.deletePost).to.be.true;
                        }).catch(handleError);
                });
            });
        });
    });
});