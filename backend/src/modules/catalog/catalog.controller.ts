import { FastifyReply, FastifyRequest } from 'fastify';
import { CatalogService } from './catalog.service.js';
import {
  getResourcesQuerySchema,
  getAvailabilityQuerySchema,
  createMaintenanceBlockSchema,
} from './catalog.schemas.js';

const catalogService = new CatalogService();

export class CatalogController {
  async getSites(request: FastifyRequest, reply: FastifyReply) {
    const sites = await catalogService.getSites();
    return reply.status(200).send(sites);
  }

  async getResourcesBySite(request: FastifyRequest, reply: FastifyReply) {
    const { siteId } = request.params as { siteId: string };
    const query = getResourcesQuerySchema.parse(request.query);
    const resources = await catalogService.getResourcesBySite(siteId, query);
    return reply.status(200).send(resources);
  }

  async getResourceById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const resource = await catalogService.getResourceById(id);
    return reply.status(200).send(resource);
  }

  async getAvailability(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const query = getAvailabilityQuerySchema.parse(request.query);
    const availability = await catalogService.getAvailability(id, query);
    return reply.status(200).send(availability);
  }

  async createMaintenanceBlock(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const input = createMaintenanceBlockSchema.parse(request.body);
    const result = await catalogService.createMaintenanceBlock(
      id,
      request.user!.userId,
      input
    );
    return reply.status(201).send(result);
  }
}
