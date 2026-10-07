import { relations } from "drizzle-orm";
import { users, accounts, sessions } from "./identity.js";
import { projects, pages, siteDomains, media } from "./sites.js";
import { productCategories, products, productAttributeTypes, productAttributes } from "./commerce.js";
import { blogCategories, blogs } from "./content.js";

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  projects: many(projects),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, {
    fields: [projects.userId],
    references: [users.id],
  }),
  pages: many(pages),
  blogs: many(blogs),
  domains: many(siteDomains),
  media: many(media),
}));

export const mediaRelations = relations(media, ({ one }) => ({
  project: one(projects, {
    fields: [media.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [media.userId],
    references: [users.id],
  }),
}));

export const siteDomainsRelations = relations(siteDomains, ({ one }) => ({
  project: one(projects, {
    fields: [siteDomains.projectId],
    references: [projects.id],
  }),
}));

export const pagesRelations = relations(pages, ({ one }) => ({
  project: one(projects, {
    fields: [pages.projectId],
    references: [projects.id],
  }),
}));

export const productCategoriesRelations = relations(
  productCategories,
  ({ one, many }) => ({
    project: one(projects, {
      fields: [productCategories.projectId],
      references: [projects.id],
    }),
    parent: one(productCategories, {
      fields: [productCategories.parentId],
      references: [productCategories.id],
    }),
    children: many(productCategories),
    products: many(products),
  }),
);

export const productsRelations = relations(products, ({ one }) => ({
  project: one(projects, {
    fields: [products.projectId],
    references: [projects.id],
  }),
  category: one(productCategories, {
    fields: [products.categoryId],
    references: [productCategories.id],
  }),
  page: one(pages, {
    fields: [products.pageId],
    references: [pages.id],
  }),
}));

export const productAttributeTypesRelations = relations(
  productAttributeTypes,
  ({ one, many }) => ({
    project: one(projects, {
      fields: [productAttributeTypes.projectId],
      references: [projects.id],
    }),
    attributes: many(productAttributes),
  }),
);

export const productAttributesRelations = relations(
  productAttributes,
  ({ one }) => ({
    type: one(productAttributeTypes, {
      fields: [productAttributes.typeId],
      references: [productAttributeTypes.id],
    }),
  }),
);

export const blogCategoriesRelations = relations(
  blogCategories,
  ({ one, many }) => ({
    project: one(projects, {
      fields: [blogCategories.projectId],
      references: [projects.id],
    }),
    parent: one(blogCategories, {
      fields: [blogCategories.parentId],
      references: [blogCategories.id],
    }),
    children: many(blogCategories),
    blogs: many(blogs),
  }),
);

export const blogsRelations = relations(blogs, ({ one }) => ({
  project: one(projects, {
    fields: [blogs.projectId],
    references: [projects.id],
  }),
  category: one(blogCategories, {
    fields: [blogs.categoryId],
    references: [blogCategories.id],
  }),
  author: one(users, {
    fields: [blogs.authorId],
    references: [users.id],
  }),
}));
