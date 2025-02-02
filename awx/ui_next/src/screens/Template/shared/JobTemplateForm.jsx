import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router-dom';
import { withI18n } from '@lingui/react';
import { t } from '@lingui/macro';
import { Formik, Field } from 'formik';
import { Form, FormGroup, Tooltip, Card } from '@patternfly/react-core';
import { QuestionCircleIcon as PFQuestionCircleIcon } from '@patternfly/react-icons';
import ContentError from '@components/ContentError';
import ContentLoading from '@components/ContentLoading';
import AnsibleSelect from '@components/AnsibleSelect';
import MultiSelect from '@components/MultiSelect';
import FormActionGroup from '@components/FormActionGroup';
import FormField from '@components/FormField';
import FormRow from '@components/FormRow';
import { required } from '@util/validators';
import styled from 'styled-components';
import { JobTemplate } from '@types';
import InventoriesLookup from './InventoriesLookup';
import ProjectLookup from './ProjectLookup';
import { LabelsAPI } from '@api';

const QuestionCircleIcon = styled(PFQuestionCircleIcon)`
  margin-left: 10px;
`;
const QSConfig = {
  page: 1,
  page_size: 200,
  order_by: 'name',
};

class JobTemplateForm extends Component {
  static propTypes = {
    template: JobTemplate,
    handleCancel: PropTypes.func.isRequired,
    handleSubmit: PropTypes.func.isRequired,
  };

  static defaultProps = {
    template: {
      name: '',
      description: '',
      job_type: 'run',
      inventory: undefined,
      project: undefined,
      playbook: '',
      summary_fields: {
        inventory: null,
        labels: { results: [] },
      },
    },
  };

  constructor(props) {
    super(props);
    this.state = {
      hasContentLoading: true,
      contentError: false,
      loadedLabels: [],
      newLabels: [],
      removedLabels: [],
      project: props.template.summary_fields.project,
      inventory: props.template.summary_fields.inventory,
    };
    this.handleNewLabel = this.handleNewLabel.bind(this);
    this.loadLabels = this.loadLabels.bind(this);
    this.removeLabel = this.removeLabel.bind(this);
  }

  componentDidMount() {
    this.loadLabels(QSConfig);
  }

  async loadLabels(QueryConfig) {
    // This function assumes that the user has no more than 400
    // labels. For the vast majority of users this will be more thans
    // enough.This can be updated to allow more than 400 labels if we
    // decide it is necessary.
    this.setState({ contentError: null, hasContentLoading: true });
    let loadedLabels;
    try {
      const { data } = await LabelsAPI.read(QueryConfig);
      loadedLabels = [...data.results];
      if (data.next && data.next.includes('page=2')) {
        const {
          data: { results },
        } = await LabelsAPI.read({
          page: 2,
          page_size: 200,
          order_by: 'name',
        });
        loadedLabels = loadedLabels.concat(results);
      }
      this.setState({ loadedLabels });
    } catch (err) {
      this.setState({ contentError: err });
    } finally {
      this.setState({ hasContentLoading: false });
    }
  }

  handleNewLabel(label) {
    const { newLabels } = this.state;
    const { template } = this.props;
    const isIncluded = newLabels.some(newLabel => newLabel.name === label.name);
    if (isIncluded) {
      const filteredLabels = newLabels.filter(
        newLabel => newLabel.name !== label
      );
      this.setState({ newLabels: filteredLabels });
    } else if (typeof label === 'string') {
      this.setState({
        newLabels: [
          ...newLabels,
          {
            name: label,
            organization: template.summary_fields.inventory.organization_id,
          },
        ],
      });
    } else {
      this.setState({
        newLabels: [
          ...newLabels,
          { name: label.name, associate: true, id: label.id },
        ],
      });
    }
  }

  removeLabel(label) {
    const { removedLabels, newLabels } = this.state;
    const { template } = this.props;

    const isAssociatedLabel = template.summary_fields.labels.results.some(
      tempLabel => tempLabel.id === label.id
    );

    if (isAssociatedLabel) {
      this.setState({
        removedLabels: removedLabels.concat({
          disassociate: true,
          id: label.id,
        }),
      });
    } else {
      const filteredLabels = newLabels.filter(
        newLabel => newLabel.name !== label.name
      );
      this.setState({ newLabels: filteredLabels });
    }
  }

  render() {
    const {
      loadedLabels,
      contentError,
      hasContentLoading,
      inventory,
      project,
      newLabels,
      removedLabels,
    } = this.state;
    const { handleCancel, handleSubmit, i18n, template } = this.props;
    const jobTypeOptions = [
      {
        value: '',
        key: '',
        label: i18n._(t`Choose a job type`),
        isDisabled: true,
      },
      { value: 'run', key: 'run', label: i18n._(t`Run`), isDisabled: false },
      {
        value: 'check',
        key: 'check',
        label: i18n._(t`Check`),
        isDisabled: false,
      },
    ];

    if (hasContentLoading) {
      return (
        <Card className="awx-c-card">
          <ContentLoading />
        </Card>
      );
    }

    if (contentError) {
      return (
        <Card className="awx-c-card">
          <ContentError error={contentError} />
        </Card>
      );
    }

    return (
      <Formik
        initialValues={{
          name: template.name,
          description: template.description,
          job_type: template.job_type,
          inventory: template.inventory || '',
          project: template.project || '',
          playbook: template.playbook,
          labels: template.summary_fields.labels.results,
        }}
        onSubmit={values => {
          handleSubmit(values, newLabels, removedLabels);
        }}
        render={formik => (
          <Form autoComplete="off" onSubmit={formik.handleSubmit}>
            <FormRow>
              <FormField
                id="template-name"
                name="name"
                type="text"
                label={i18n._(t`Name`)}
                validate={required(null, i18n)}
                isRequired
              />
              <FormField
                id="template-description"
                name="description"
                type="text"
                label={i18n._(t`Description`)}
              />
              <Field
                name="job_type"
                validate={required(null, i18n)}
                render={({ field }) => (
                  <FormGroup
                    fieldId="template-job-type"
                    isRequired
                    label={i18n._(t`Job Type`)}
                  >
                    <Tooltip
                      position="right"
                      content={i18n._(t`For job templates, select run to execute
                      the playbook. Select check to only check playbook syntax,
                      test environment setup, and report problems without
                      executing the playbook.`)}
                    >
                      <QuestionCircleIcon />
                    </Tooltip>
                    <AnsibleSelect data={jobTypeOptions} {...field} />
                  </FormGroup>
                )}
              />
              <Field
                name="inventory"
                validate={required(null, i18n)}
                render={({ form }) => (
                  <InventoriesLookup
                    value={inventory}
                    tooltip={i18n._(t`Select the inventory containing the hosts
                      you want this job to manage.`)}
                    onChange={value => {
                      form.setFieldValue('inventory', value.id);
                      this.setState({ inventory: value });
                    }}
                    required
                  />
                )}
              />
              <Field
                name="project"
                validate={required(null, i18n)}
                render={({ form }) => (
                  <ProjectLookup
                    value={project}
                    tooltip={i18n._(t`Select the project containing the playbook
                    you want this job to execute.`)}
                    onChange={value => {
                      form.setFieldValue('project', value.id);
                      this.setState({ project: value });
                    }}
                    required
                  />
                )}
              />
              <FormField
                id="template-playbook"
                name="playbook"
                type="text"
                label={i18n._(t`Playbook`)}
                tooltip={i18n._(
                  t`Select the playbook to be executed by this job.`
                )}
                isRequired
                validate={required(null, i18n)}
              />
            </FormRow>
            <FormRow>
              <FormGroup label={i18n._(t`Labels`)} fieldId="template-labels">
                <Tooltip
                  position="right"
                  content={i18n._(
                    t`Optional labels that describe this job template, such as 'dev' or 'test'. Labels can be used to group and filter job templates and completed jobs.`
                  )}
                >
                  <QuestionCircleIcon />
                </Tooltip>
                <MultiSelect
                  onAddNewItem={this.handleNewLabel}
                  onRemoveItem={this.removeLabel}
                  associatedItems={template.summary_fields.labels.results}
                  options={loadedLabels}
                />
              </FormGroup>
            </FormRow>
            <FormActionGroup
              onCancel={handleCancel}
              onSubmit={formik.handleSubmit}
            />
          </Form>
        )}
      />
    );
  }
}
export { JobTemplateForm as _JobTemplateForm };
export default withI18n()(withRouter(JobTemplateForm));
