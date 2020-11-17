'use strict';

module.exports = function(Resource, resource, association) {
  // access points
  var subResourceName = association.as ? association.as :
      association.target.options.name.plural;
  var excludeAttributes = [];
  if (resource.associationOptions[subResourceName] && resource.associationOptions[subResourceName].excludeAttributes)
    excludeAttributes = resource.associationOptions[subResourceName].excludeAttributes;

    var associatedResource = new Resource({
    app: resource.app,
    sequelize: resource.sequelize,
    model: association.target,
    excludeAttributes,
    endpoints: [
      resource.endpoints.plural + '/:' + association.identifierField + '/' + subResourceName.toLowerCase(),
      resource.endpoints.plural + '/:' + association.identifierField + '/' + subResourceName.toLowerCase() + '/:' + association.target.primaryKeyField
    ],
    actions: ['read', 'list']
  });

  // @todo: this could be improved
  associatedResource.associationOptions = resource.associationOptions;
  associatedResource.controllers.read.includeAttributes = [ association.identifierField ];
  associatedResource.controllers.list.includeAttributes = [ association.identifierField ];

  associatedResource.list.fetch.before(function(req, res, context) {
    // Filter
    context.criteria = context.criteria || {};
    context.criteria[association.identifierField] = req.params[association.identifierField];
    context.continue();
  });

  return associatedResource;
};
