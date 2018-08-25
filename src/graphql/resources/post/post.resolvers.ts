import {GraphQLResolveInfo} from "graphql";
import {DbConnection} from "../../../interfaces/DbConnectionInterface";
import {PostInstance} from "../../../models/PostModel";
import {Transaction} from "sequelize";
import {handleError} from "../../../utils/utils";

export const postResolvers = {

    Post: {
        author: (post: PostInstance, args, {db}: { db: DbConnection }, info: GraphQLResolveInfo) => {
            return db.User
                .findById(post.get('author'))
                .catch(handleError);
        },
        comments: (post: PostInstance, {first = 10, offset = 0}, {db}: { db: DbConnection }, info: GraphQLResolveInfo) => {
            return db.Comment
                .findAll({
                    where: {post: post.get('id')},
                    limit: first,
                    offset: offset
                })
                .catch(handleError);
        }
    },

    Query: {
        posts: (parent, {first = 10, offset = 0}, {db}: { db: DbConnection }, info: GraphQLResolveInfo) => {
            return db.Post
                .findAll({
                    limit: first,
                    offset: offset
                })
                .catch(handleError);
        },
        post: (parent, {id}, {db}: { db: DbConnection }, info: GraphQLResolveInfo) => {
            return db.Post
                .findById(id)
                .then((post: PostInstance) => {
                    if (!post) {
                        throw new Error(`Pos with id ${id} not found`);
                    }

                    return post;
                })
                .catch(handleError);
        }
    },

    Mutation: {
        createPost: (parent, {input}, {db}: { db: DbConnection }, info: GraphQLResolveInfo) => {
            return db.sequelize.transaction((t: Transaction) => {
                return db.Post.create(input, {transaction: t});
            }).catch(handleError);
        },
        updatePost: (parent, {id, input}, {db}: { db: DbConnection }, info: GraphQLResolveInfo) => {
            id = parseInt(id);
            return db.sequelize.transaction((t: Transaction) => {
                return db.Post
                    .findById(id)
                    .then((post: PostInstance) => {
                        if (!post) {
                            throw new Error(`Pos with id ${id} not found`);
                        }

                        return post.update(input, {transaction: t});
                    });
            }).catch(handleError);
        },
        deletePost: (parent, {id, input}, {db}: { db: DbConnection }, info: GraphQLResolveInfo) => {
            id = parseInt(id);
            return db.sequelize.transaction((t: Transaction) => {
                return db.Post
                    .findById(id)
                    .then((post: PostInstance) => {
                        if (!post) {
                            throw new Error(`Pos with id ${id} not found`);
                        }

                        return post.destroy({transaction: t})
                            .then(post => !!post);
                    });
            }).catch(handleError);
        }

    }
};