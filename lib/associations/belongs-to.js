'use strict';

module.exports = function(Resource, resource, association) {
  // access points
  var subResourceName = association.as ? association.as :
      association.target.options.name.singular;
  var excludeAttributes = [];
  if (resource.associationOptions[subResourceName] && resource.associationOptions[subResourceName].excludeAttributes)
    excludeAttributes = resource.associationOptions[subResourceName].excludeAttributes;

  var associatedResource = new Resource({
    app: resource.app,
    sequelize: resource.sequelize,
    model: association.target,
    excludeAttributes,
    endpoints: [resource.endpoints.singular + '/' + subResourceName.toLowerCase()],
    actions: ['read']
  });

  // @todo: this could be improved...
  associatedResource.associationOptions = resource.associationOptions;
  associatedResource.controllers.read.includeAttributes = [ association.identifierField ];

  associatedResource.read.send.before(function(req, res, context) {
    if (this.resource.associationOptions.removeForeignKeys)
      delete context.instance.dataValues[association.identifierField];

    context.continue();
  });

  return associatedResource;
};
