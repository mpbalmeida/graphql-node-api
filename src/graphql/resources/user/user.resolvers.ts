import {GraphQLResolveInfo} from "graphql";
import {DbConnection} from "../../../interfaces/DbConnectionInterface";
import {UserInstance} from "../../../models/UserModel";
import {Transaction} from "sequelize";
import {handleError, throwError} from "../../../utils/utils";
import {compose} from "../../composable/composable.resolver";
import {AuthUser} from "../../../interfaces/AuthUserInterface";
import {authResolvers} from "../../composable/auth.resolver";
import {RequestedFields} from "../../ast/RequestedFields";
import {ResolverContext} from "../../../interfaces/ResolverContextInterface";

export const userResolvers = {

    User: {
        posts: (parent, {first = 10, offset = 0}, context: ResolverContext, info: GraphQLResolveInfo) => {
            return context.db.Post.findAll({
                where: {author: parent.get('id')},
                limit: first,
                offset: offset,
                attributes: context.requestedFields.getFields(info, {keep: ['id'], exclude: ['comments']})
            }).catch(handleError);
        }
    },

    Query: {
        users: (parent, {first = 10, offset = 0}, context: ResolverContext, info: GraphQLResolveInfo) => {
            return context.db.User.findAll({
                limit: first,
                offset: offset,
                attributes: context.requestedFields.getFields(info, {keep: ['id'], exclude: ['posts']})
            }).catch(handleError);
        },

        user: (parent, {id}, context: ResolverContext, info: GraphQLResolveInfo) => {
            id = parseInt(id);
            return context.db.User.findByPk(id,{
                attributes: context.requestedFields.getFields(info, {keep: ['id'], exclude: ['posts']})
            }).then((user: UserInstance) => {
                throwError(!user, `User with id ${id} not found!`);

                return user;
            }).catch(handleError);
        },

        currentUser: (parent, args, context: ResolverContext, info: GraphQLResolveInfo) => {
            return context.db.User.findByPk(context.authUser.id, {
                attributes: context.requestedFields.getFields(info, {keep: ['id'], exclude: ['posts']})
            }).then((user: UserInstance) => {
                throwError(!user, `User with id ${context.authUser.id} not found!`);

                return user;
            }).catch(handleError);
        },
    },

    Mutation: {
        createUser: (parent, args, {db}: { db: DbConnection }, info: GraphQLResolveInfo) => {
            return db.sequelize.transaction((t: Transaction) => {
                return db.User.create(args.input, {transaction: t});
            }).catch(handleError);
        },
        updateUser: compose(...authResolvers)((parent, {input}, {db, authUser}: {db: DbConnection, authUser: AuthUser}, info: GraphQLResolveInfo) => {
            return db.sequelize.transaction((t: Transaction) => {
                return db.User
                    .findByPk(authUser.id)
                    .then((user: UserInstance) => {
                        throwError(!user, `User with id ${authUser.id} not found!`);
                        return user.update(input, {transaction: t});
                    });
            }).catch(handleError);
        }),
        updateUserPassword: compose(...authResolvers) ((parent, {input}, {db, authUser}: { db: DbConnection, authUser: AuthUser }, info: GraphQLResolveInfo) => {
            return db.sequelize.transaction((t: Transaction) => {
                return db.User
                    .findByPk(authUser.id)
                    .then((user: UserInstance) => {
                        throwError(!user, `User with id ${authUser.id} not found!`);

                        return user.update(input, {transaction: t})
                            .then((user: UserInstance) => !!user);
                    });
            }).catch(handleError);
        }),
        deleteUser: compose(...authResolvers) ((parent, {input}, {db, authUser}: { db: DbConnection, authUser: AuthUser }, info: GraphQLResolveInfo) => {
            return db.sequelize.transaction((t: Transaction) => {
                return db.User
                    .findByPk(authUser.id)
                    .then((user: UserInstance) => {
                        throwError(!user, `User with id ${authUser.id} not found!`);

                        return user.destroy({transaction: t})
                            .then(() => true)
                            .catch(() => false);
                    })
            }).catch(handleError);
        }),
    }
};