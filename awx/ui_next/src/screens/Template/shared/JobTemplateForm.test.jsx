import React from 'react';
import { mountWithContexts, waitForElement } from '@testUtils/enzymeHelpers';
import { sleep } from '@testUtils/testUtils';
import JobTemplateForm, { _JobTemplateForm } from './JobTemplateForm';
import { LabelsAPI } from '@api';

jest.mock('@api');

describe('<JobTemplateForm />', () => {
  const mockData = {
    id: 1,
    name: 'Foo',
    description: 'Bar',
    job_type: 'run',
    inventory: 2,
    project: 3,
    playbook: 'Baz',
    type: 'job_template',
    summary_fields: {
      inventory: {
        id: 2,
        name: 'foo',
        organization_id: 1,
      },
      project: {
        id: 3,
        name: 'qux',
      },
      labels: { results: [{ name: 'Sushi', id: 1 }, { name: 'Major', id: 2 }] },
    },
  };
  beforeEach(() => {
    LabelsAPI.read.mockReturnValue({
      data: mockData.summary_fields.labels,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('initially renders successfully', async done => {
    const wrapper = mountWithContexts(
      <JobTemplateForm
        template={mockData}
        handleSubmit={jest.fn()}
        handleCancel={jest.fn()}
      />
    );
    await waitForElement(wrapper, 'EmptyStateBody', el => el.length === 0);
    expect(LabelsAPI.read).toHaveBeenCalled();
    expect(
      wrapper
        .find('FormGroup[fieldId="template-labels"] MultiSelect Chip')
        .first()
        .text()
    ).toEqual('Sushi');
    done();
  });

  test('should update form values on input changes', async done => {
    const wrapper = mountWithContexts(
      <JobTemplateForm
        template={mockData}
        handleSubmit={jest.fn()}
        handleCancel={jest.fn()}
      />
    );
    await waitForElement(wrapper, 'EmptyStateBody', el => el.length === 0);
    const form = wrapper.find('Formik');
    wrapper.find('input#template-name').simulate('change', {
      target: { value: 'new foo', name: 'name' },
    });
    expect(form.state('values').name).toEqual('new foo');
    wrapper.find('input#template-description').simulate('change', {
      target: { value: 'new bar', name: 'description' },
    });
    expect(form.state('values').description).toEqual('new bar');
    wrapper.find('AnsibleSelect[name="job_type"]').simulate('change', {
      target: { value: 'new job type', name: 'job_type' },
    });
    expect(form.state('values').job_type).toEqual('new job type');
    wrapper.find('InventoriesLookup').prop('onChange')({
      id: 3,
      name: 'inventory',
    });
    expect(form.state('values').inventory).toEqual(3);
    wrapper.find('ProjectLookup').prop('onChange')({
      id: 4,
      name: 'project',
    });
    expect(form.state('values').project).toEqual(4);
    wrapper.find('input#template-playbook').simulate('change', {
      target: { value: 'new baz type', name: 'playbook' },
    });
    expect(form.state('values').playbook).toEqual('new baz type');
    done();
  });

  test('should call handleSubmit when Submit button is clicked', async done => {
    const handleSubmit = jest.fn();
    const wrapper = mountWithContexts(
      <JobTemplateForm
        template={mockData}
        handleSubmit={handleSubmit}
        handleCancel={jest.fn()}
      />
    );
    await waitForElement(wrapper, 'EmptyStateBody', el => el.length === 0);
    expect(handleSubmit).not.toHaveBeenCalled();
    wrapper.find('button[aria-label="Save"]').simulate('click');
    await sleep(1);
    expect(handleSubmit).toBeCalled();
    done();
  });

  test('should call handleCancel when Cancel button is clicked', async done => {
    const handleCancel = jest.fn();
    const wrapper = mountWithContexts(
      <JobTemplateForm
        template={mockData}
        handleSubmit={jest.fn()}
        handleCancel={handleCancel}
      />
    );
    await waitForElement(wrapper, 'EmptyStateBody', el => el.length === 0);
    expect(handleCancel).not.toHaveBeenCalled();
    wrapper.find('button[aria-label="Cancel"]').prop('onClick')();
    expect(handleCancel).toBeCalled();
    done();
  });

  test('handleNewLabel should arrange new labels properly', async done => {
    const handleNewLabel = jest.spyOn(
      _JobTemplateForm.prototype,
      'handleNewLabel'
    );
    const event = { key: 'Tab' };
    const wrapper = mountWithContexts(
      <JobTemplateForm
        template={mockData}
        handleSubmit={jest.fn()}
        handleCancel={jest.fn()}
      />
    );
    await waitForElement(wrapper, 'EmptyStateBody', el => el.length === 0);
    const multiSelect = wrapper.find('MultiSelect');
    const component = wrapper.find('JobTemplateForm');

    wrapper.setState({ newLabels: [], loadedLabels: [], removedLabels: [] });
    multiSelect.setState({ input: 'Foo' });
    component.find('input[aria-label="labels"]').prop('onKeyDown')(event);
    expect(handleNewLabel).toHaveBeenCalledWith('Foo');

    component.instance().handleNewLabel({ name: 'Bar', id: 2 });
    expect(component.state().newLabels).toEqual([
      { name: 'Foo', organization: 1 },
      { associate: true, id: 2, name: 'Bar' },
    ]);
    done();
  });
  test('disassociateLabel should arrange new labels properly', async done => {
    const wrapper = mountWithContexts(
      <JobTemplateForm
        template={mockData}
        handleSubmit={jest.fn()}
        handleCancel={jest.fn()}
      />
    );
    await waitForElement(wrapper, 'EmptyStateBody', el => el.length === 0);
    const component = wrapper.find('JobTemplateForm');
    // This asserts that the user generated a label or clicked
    // on a label option, and then changed their mind and
    // removed the label.
    component.instance().removeLabel({ name: 'Alex', id: 17 });
    expect(component.state().newLabels.length).toBe(0);
    expect(component.state().removedLabels.length).toBe(0);
    // This asserts that the user removed a label that was associated
    // with the template when the template loaded.
    component.instance().removeLabel({ name: 'Sushi', id: 1 });
    expect(component.state().newLabels.length).toBe(0);
    expect(component.state().removedLabels.length).toBe(1);
    done();
  });
});
