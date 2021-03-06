/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const React = require('react');
const Component = require('react').Component;
const jsonpath = require('jsonpath');
const ReactFormVisitor = require('concerto-form-react').ReactFormVisitor;
const {Message} = require('semantic-ui-react');
const PropTypes = require('prop-types');
const {FormGenerator} = require('concerto-form-core');

/**
 * This React component generates a React object for a bound model.
 */
class ConcertoForm extends Component {
  constructor(props) {
    super(props);

    this.onChange = this.onChange.bind(this);

    this.state = {
      json: null,
      form: null,
      types: [],
    };

    this.options = Object.assign({
      state: this.state,
      visitor: new ReactFormVisitor(),
      // CSS Styling, specify classnames
      customClasses : {
        field: 'ui field',
        declaration: 'ui field',
        declarationHeader: 'ui dividing header',
        enumeration: 'ui fluid dropdown',
        required: 'ui required',
        boolean: 'ui toggle checkbox',
        button: 'ui fluid button'
      },
      onChange: (e, key) => {
        this.onChange(e, key);
      },
      addElement: (e, key, field) => {
        this.addElement(e, key, field);
      },
      removeElement: (e, key, index) => {
        this.removeElement(e, key, index);
      },
    }, props.options);

    this.generator = new FormGenerator();
  }

  async loadModelFile(file, type) {
    try {
      if  (type === 'text') {
        await this.generator.loadFromText(file);
      } else if (type === 'url') {
        await this.generator.loadFromUrl(file);
      }
      this.setState({types: this.generator.getTypes()}, () => {
        this.props.onModelChange(this.state.types, this.state.json);
      });
    } catch (error) {
      this.setState({warning: `Invalid Model File: ${error.message}`});
    }
  }

  async componentWillReceiveProps(nextProps) {
    // Any time props.model changes, update state.
    if (nextProps.model !== this.props.model) {
      this.renderForm(nextProps.model, true);
    }

    if (nextProps.json !== this.props.json && this.props.model) {
      this.setState({json: nextProps.json}, () => {
        this.renderForm(this.props.model);
      });
    }

    if (nextProps.modelFile !== this.props.modelFile) {
      await this.loadModelFile(nextProps.modelFile, 'text');
      if(nextProps.model){
        this.renderForm(nextProps.model, true);
      }
      return;
    }

    if (nextProps.modelUrl !== this.props.modelUrl) {
      await this.loadModelFile(nextProps.modelUrl, 'url');
      if(nextProps.model){
        this.renderForm(nextProps.model, true);
      }
      return;
    }
  }

  componentDidMount(){
    if(this.props.model){
      this.setState({json: this.props.json});
      this.renderForm(this.props.model);
    }
  }

  removeElement(e, key, index){
    const array = jsonpath.value(this.state.json, key);
    array.splice(index, 1);
    this.renderForm(this.props.model);
  }

  addElement(e, key, value){
    const array = jsonpath.value(this.state.json, key);
    jsonpath.value(this.state.json,`${key}.${array.length}`, value);
    this.renderForm(this.props.model);
  }

  onChange(e, key) {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    jsonpath.value(this.state.json, key, value);
    this.setState({warning: this.generator.validateInstance(this.state.json) }, ()=>{
      this.renderForm(this.props.model);
    });
  }

  renderForm(model, reset){
    this.options.state = this.state;
    if(reset){
      this.options.state = {
        json: null,
        form: null,
      };
    }
    try {
      const {form, json} = this.generator.generateHTML(model, this.options);
      this.setState({form, json, warning: null}, ()=> {
        this.props.onModelChange(this.state.types, json);
      });
      return {form, json};
    } catch (error) {
      this.setState({warning: `Invalid Model File: ${error.message}`});
    }
  }

  render() {
    let warning = null;

    if(this.state.warning){
      warning = (<Message visible warning>
        <p>{this.state.warning}</p>
      </Message>);
    }

    return (<form className="ui form">
          {warning}
          {this.state.form}
        </form>);
  }
}

ConcertoForm.propTypes = {
  modelFile: PropTypes.string,
  modelUrl: PropTypes.string,
  model: PropTypes.string.isRequired,
  onModelChange: PropTypes.func.isRequired,
  json: PropTypes.object,
  options: PropTypes.object,
};

module.exports = ConcertoForm;
