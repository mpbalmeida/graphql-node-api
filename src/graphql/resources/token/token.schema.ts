const tokenTypes = `
    tyoe Token {
        token: String!
    }
`;

const tokenMutations = `
    createToken(email: String!, password: String!): Token
`;

export {
    tokenTypes,
    tokenMutations
}