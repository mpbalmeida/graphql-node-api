import {GraphQLResolveInfo} from "graphql";
import {DbConnection} from "../../../interfaces/DbConnectionInterface";
import {CommentInstance} from "../../../models/CommentModel";
import {Transaction} from "sequelize";
import {handleError, throwError} from "../../../utils/utils";
import {compose} from "../../composable/composable.resolver";
import {authResolvers} from "../../composable/auth.resolver";
import {AuthUser} from "../../../interfaces/AuthUserInterface";
import {DataLoaders} from "../../../interfaces/DataLoadersInterface";
import {ResolverContext} from "../../../interfaces/ResolverContextInterface";

export const commentResolvers = {

    Comment: {
        user: (comment: CommentInstance, args, {db, dataLoaders: {userLoader}}: { db: DbConnection, dataLoaders: DataLoaders }, info: GraphQLResolveInfo) => {
            return userLoader
                .load({key: comment.get('user'), info})
                .catch(handleError);
        },

        post: (comment: CommentInstance, args, {db, dataLoaders: {postLoader}}: { db: DbConnection, dataLoaders: DataLoaders }, info: GraphQLResolveInfo) => {
            return postLoader
                .load({key: comment.get('post'), info})
                .catch(handleError);
        }

    },

    Query: {
        commentsByPost: compose()((parent, {postId, first = 10, offset = 0}, context: ResolverContext, info: GraphQLResolveInfo) => {
            postId = parseInt(postId);
            return context.db.Comment
                .findAll({
                    limit: first,
                    offset,
                    where: {post: postId},
                    attributes: context.requestedFields.getFields(info, {keep: undefined})
                })
                .catch(handleError);
        })
    },

    Mutation: {
        createComment: compose(...authResolvers)((parent, {input}, {db, authUser}: { db: DbConnection, authUser: AuthUser }, info: GraphQLResolveInfo) => {
            input.user = authUser.id;
            return db.sequelize.transaction((t: Transaction) => {
                return db.Comment.create(input, {transaction: t});
            }).catch(handleError);
        }),
        updateComment: compose(...authResolvers)((parent, {id, input}, {db, authUser}: { db: DbConnection, authUser: AuthUser }, info: GraphQLResolveInfo) => {
            id = parseInt(id);
            return db.sequelize.transaction((t: Transaction) => {
                return db.Comment.findByPk(id)
                    .then((comment: CommentInstance) => {
                        throwError(!comment, `Commend with id ${id} not fount`);
                        throwError(comment.get('user') != authUser.id, `Unauthorized! You can only edit comments by yourself!`);
                        input.user = authUser.id;

                        return comment.update(input, {transaction: t});
                    });
            }).catch(handleError);
        }),
        deleteComment: compose(...authResolvers)((parent, {id}, {db, authUser}: { db: DbConnection, authUser: AuthUser }, info: GraphQLResolveInfo) => {
            id = parseInt(id);
            return db.sequelize.transaction((t: Transaction) => {
                return db.Comment.findByPk(id)
                    .then((comment: CommentInstance) => {
                        throwError(!comment, `Commend with id ${id} not fount`);
                        throwError(comment.get('user') != authUser.id, `Unauthorized! You can only delete comments by yourself!`);

                        return comment.destroy({transaction: t})
                            .then(() => true)
                            .catch(() => false);
                    });
            }).catch(handleError);
        })

    }
};