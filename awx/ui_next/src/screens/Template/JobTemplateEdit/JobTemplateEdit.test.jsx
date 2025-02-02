import React from 'react';
import { JobTemplatesAPI, LabelsAPI } from '@api';
import { mountWithContexts, waitForElement } from '@testUtils/enzymeHelpers';
import JobTemplateEdit from './JobTemplateEdit';

jest.mock('@api');

const mockJobTemplate = {
  id: 1,
  name: 'Foo',
  description: 'Bar',
  job_type: 'run',
  inventory: 2,
  project: 3,
  playbook: 'Baz',
  type: 'job_template',
  summary_fields: {
    user_capabilities: {
      edit: true,
    },
    labels: {
      results: [{ name: 'Sushi', id: 1 }, { name: 'Major', id: 2 }],
    },
  },
};

const mockRelatedCredentials = {
  count: 2,
  next: null,
  previous: null,
  results: [
    {
      id: 1,
      type: 'credential',
      url: '/api/v2/credentials/1/',
      related: {},
      summary_fields: {
        user_capabilities: {
          edit: true,
          delete: true,
          copy: true,
          use: true,
        },
      },
      created: '2016-08-24T20:20:44.411607Z',
      modified: '2019-06-18T16:14:00.109434Z',
      name: 'Test Vault Credential',
      description: 'Credential with access to vaulted data.',
      organization: 1,
      credential_type: 3,
      inputs: { vault_password: '$encrypted$' },
    },
    {
      id: 2,
      type: 'credential',
      url: '/api/v2/credentials/2/',
      related: {},
      summary_fields: {
        user_capabilities: {
          edit: true,
          delete: true,
          copy: true,
          use: true,
        },
      },
      created: '2016-08-24T20:20:44.411607Z',
      modified: '2017-07-11T15:58:39.103659Z',
      name: 'Test Machine Credential',
      description: 'Credential with access to internal machines.',
      organization: 1,
      credential_type: 1,
      inputs: { ssh_key_data: '$encrypted$' },
    },
  ],
};

JobTemplatesAPI.readCredentials.mockResolvedValue({
  data: mockRelatedCredentials,
});
LabelsAPI.read.mockResolvedValue({ data: { results: [] } });

describe('<JobTemplateEdit />', () => {
  test('initially renders successfully', async done => {
    const wrapper = mountWithContexts(
      <JobTemplateEdit template={mockJobTemplate} />
    );
    await waitForElement(wrapper, 'EmptyStateBody', el => el.length === 0);
    done();
  });

  test('handleSubmit should call api update', async done => {
    const wrapper = mountWithContexts(
      <JobTemplateEdit template={mockJobTemplate} />
    );
    await waitForElement(wrapper, 'JobTemplateForm', e => e.length === 1);
    const updatedTemplateData = {
      name: 'new name',
      description: 'new description',
      job_type: 'check',
    };
    const newLabels = [
      { associate: true, id: 3 },
      { associate: true, id: 3 },
      { name: 'Mapel', organization: 1 },
      { name: 'Tree', organization: 1 },
    ];
    const removedLabels = [
      { disassociate: true, id: 1 },
      { disassociate: true, id: 2 },
    ];

    await wrapper.find('JobTemplateForm').prop('handleSubmit')(
      updatedTemplateData,
      newLabels,
      removedLabels
    );
    expect(JobTemplatesAPI.update).toHaveBeenCalledWith(1, updatedTemplateData);
    expect(JobTemplatesAPI.disassociateLabel).toHaveBeenCalledTimes(2);
    expect(JobTemplatesAPI.associateLabel).toHaveBeenCalledTimes(2);
    expect(JobTemplatesAPI.generateLabel).toHaveBeenCalledTimes(2);
    done();
  });

  test('should navigate to job template detail when cancel is clicked', async done => {
    const history = { push: jest.fn() };
    const wrapper = mountWithContexts(
      <JobTemplateEdit template={mockJobTemplate} />,
      { context: { router: { history } } }
    );
    const cancelButton = await waitForElement(
      wrapper,
      'button[aria-label="Cancel"]',
      e => e.length === 1
    );
    expect(history.push).not.toHaveBeenCalled();
    cancelButton.prop('onClick')();
    expect(history.push).toHaveBeenCalledWith(
      '/templates/job_template/1/details'
    );
    done();
  });
});
