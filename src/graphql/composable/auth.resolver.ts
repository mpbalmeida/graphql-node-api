import {ComposableResolver} from "./composable.resolver";
import {ResolverContext} from "../../interfaces/ResolverContextInterface";
import {GraphQLFieldResolver} from "graphql";
import {parseTypeReference} from "graphql/language/parser";

export const AuthResolver: ComposableResolver<any, ResolverContext> =
    (resolver: GraphQLFieldResolver<any, ResolverContext>): GraphQLFieldResolver<any, ResolverContext> => {

    return (parent, args, context: ResolverContext, info) => {
        if (context.user || context.authorization) {
            return resolver(parent, args, context, info);
        }
        
        throw new Error('Unauthorized! Token not provided!');
    }
};