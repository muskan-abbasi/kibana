import angular from 'angular';
import { Embeddable } from 'ui/embeddable';
import searchTemplate from './search_template.html';
import * as columnActions from 'ui/doc_table/actions/columns';

export class SearchEmbeddable extends Embeddable {
  constructor({ onEmbeddableStateChanged, savedSearch, editUrl, loader, $rootScope, $compile }) {
    super();
    this.onEmbeddableStateChanged = onEmbeddableStateChanged;
    this.savedSearch = savedSearch;
    this.loader = loader;
    this.$rootScope = $rootScope;
    this.$compile = $compile;
    this.customization = {};

    /**
     * @type {EmbeddableMetadata}
     */
    this.metadata = {
      title: savedSearch.title,
      editUrl,
      indexPattern: this.savedSearch.searchSource.get('index'),
    };
  }

  emitEmbeddableStateChange(embeddableState) {
    this.onEmbeddableStateChanged(embeddableState);
  }

  getEmbeddableState() {
    return {
      customization: this.customization
    };
  }

  pushContainerStateParamsToScope() {
    // If there is column or sort data on the panel, that means the original columns or sort settings have
    // been overridden in a dashboard.
    this.searchScope.columns = this.customization.columns || this.savedSearch.columns;
    this.searchScope.sort = this.customization.sort || this.savedSearch.sort;
    this.searchScope.sharedItemTitle = this.panelTitle;
  }

  onContainerStateChanged(containerState) {
    this.customization = containerState.embeddableCustomization || {};
    this.panelTitle = '';
    if (!containerState.hidePanelTitles) {
      this.panelTitle = containerState.customTitle !== undefined ?
        containerState.customTitle :
        this.savedSearch.title;
    }

    if (this.searchScope) {
      this.pushContainerStateParamsToScope();
    }
  }

  initializeSearchScope() {
    this.searchScope = this.$rootScope.$new();

    this.pushContainerStateParamsToScope();

    this.searchScope.description = this.savedSearch.description;
    this.searchScope.searchSource = this.savedSearch.searchSource;

    this.searchScope.setSortOrder = (columnName, direction) => {
      this.searchScope.sort = this.customization.sort = [columnName, direction];
      this.emitEmbeddableStateChange(this.getEmbeddableState());
    };

    this.searchScope.addColumn = (columnName) => {
      this.savedSearch.searchSource.get('index').popularizeField(columnName, 1);
      columnActions.addColumn(this.searchScope.columns, columnName);
      this.searchScope.columns = this.customization.columns = this.searchScope.columns;
      this.emitEmbeddableStateChange(this.getEmbeddableState());
    };

    this.searchScope.removeColumn = (columnName) => {
      this.savedSearch.searchSource.get('index').popularizeField(columnName, 1);
      columnActions.removeColumn(this.searchScope.columns, columnName);
      this.customization.columns = this.searchScope.columns;
      this.emitEmbeddableStateChange(this.getEmbeddableState());
    };

    this.searchScope.moveColumn = (columnName, newIndex) => {
      columnActions.moveColumn(this.searchScope.columns, columnName, newIndex);
      this.customization.columns = this.searchScope.columns;
      this.emitEmbeddableStateChange(this.getEmbeddableState());
    };

    this.searchScope.filter = (field, value, operator) => {
      const index = this.savedSearch.searchSource.get('index').id;
      const stagedFilter = {
        field,
        value,
        operator,
        index
      };
      this.emitEmbeddableStateChange({
        ...this.getEmbeddableState(),
        stagedFilter,
      });
    };
  }

  render(domNode) {
    this.domNode = domNode;
    this.initializeSearchScope();
    this.searchInstance = this.$compile(searchTemplate)(this.searchScope);
    const rootNode = angular.element(domNode);
    rootNode.append(this.searchInstance);
  }

  destroy() {
    this.savedSearch.destroy();
    if (this.searchScope) {
      this.searchInstance.remove();
      this.searchScope.$destroy();
      delete this.searchScope;
    }
  }
}
