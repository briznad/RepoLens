import type { PageLoad } from './$types';
import { getRepoById } from '$lib/services/repository';
import { error } from '@sveltejs/kit';

export const load: PageLoad = async ({ params }) => {
  const repoId = params.id;
  const subsystemName = params.subsystem ? decodeURIComponent(params.subsystem) : '';

  if (!subsystemName) {
    throw error(400, 'Subsystem name is required');
  }

  try {
    const repo = await getRepoById(repoId);

    if (!repo) {
      throw error(404, 'Repository not found');
    }

    const analysis = repo.analysisData;
    if (!analysis) {
      throw error(404, 'Repository analysis not found');
    }

    // Find the specific subsystem
    const subsystem = analysis.subsystems.find(
      (s: any) => s.name.toLowerCase() === subsystemName.toLowerCase()
    );

    if (!subsystem) {
      throw error(404, 'Subsystem not found');
    }

    // Find AI description if available
    const subsystemDescription = analysis.subsystemDescriptions?.find(
      (desc: any) => desc.name === subsystem.name
    );

    return {
      repo,
      analysis,
      subsystem,
      subsystemDescription,
      repoId,
      subsystemName
    };
  } catch (err) {
    if (err instanceof Error && err.message.includes('404')) {
      throw error(404, 'Repository or subsystem not found');
    }
    throw error(500, 'Failed to load repository data');
  }
};