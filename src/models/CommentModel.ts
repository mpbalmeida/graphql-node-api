import * as Sequelize from 'sequelize';
import {BaseModelInterface} from "../interfaces/BaseModelInterface";
import {ModelsInterface} from "../interfaces/ModelsInterface";

export interface CommentAttributes {
    id?: number;
    comment?: string;
    post?: number;
    user?: number;
    createdAt?: string;
    updatedAt?: string;
}

export interface CommentInstance extends Sequelize.Instance<CommentAttributes> {
}

export interface CommentModel extends BaseModelInterface, Sequelize.Model<CommentInstance, CommentAttributes> {}

export default (sequelize: Sequelize.Sequelize, DataTypes: Sequelize.DataTypes): CommentModel => {
    const Comment: CommentModel = <CommentModel> sequelize.define('comment', {
        id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        comment: {
            type: DataTypes.TEXT,
            allowNull: false
        }
    }, {
        tableName: 'comments'
    });

    Comment.associate = (models: ModelsInterface): void => {
        Comment.belongsTo(models.Post, {
            foreignKey: {
                allowNull: false,
                field: 'post',
                name: 'comment_post'
            }
        });

        Comment.belongsTo(models.User, {
            foreignKey: {
                allowNull: false,
                field: 'user',
                name: 'comment_user'
            }
        });
    };

    return Comment;
}