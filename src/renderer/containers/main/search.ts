
/* IMPORT */

import * as _ from 'lodash';
import * as isShallowEqual from 'shallowequal';
import {Container} from 'overstated';

/* SEARCH */

class Search extends Container<SearchState, MainCTX> {

  /* VARIABLES */

  _prevQuery = '';
  _prevState;

  /* STATE */

  state = {
    query: '',
    notes: [] as NoteObj[]
  };

  /* HELPERS */

  _isNoteMatch = ( note: NoteObj, query: string ): boolean => {

    return Svelto.Fuzzy.match ( this.ctx.note.getTitle ( note ), query, false );

  }

  _filterNotesByQuery = ( notes: NoteObj[], query: string ): NoteObj[] => {

    return notes.filter ( note => this._isNoteMatch ( note, query ) );

  }

  _searchBy = ( tag: string, query: string ): NoteObj[] => {

    /* OPTIMIZED SUB SEARCH */ // Filtering only the previously filtered notes

    const prevQuery = this._prevQuery;
    this._prevQuery = query;

    if ( query.startsWith ( prevQuery ) ) {

      const prevState = this._prevState,
            state = this._prevState = _.pick ( this.ctx.state, ['notes', 'sorting', 'tags', 'tag'] );

      if ( isShallowEqual ( prevState, state ) ) {

        return this._filterNotesByQuery ( this.state.notes, query );

      }

    }

    /* UNOPTIMIZED SEARCH */

    const notesByTag = this.ctx.tag.getNotes ( tag ),
          notesByQuery = this._filterNotesByQuery ( notesByTag, query ), //OPTIMIZE: If the only thing that changed is the sorting we can skip this
          notesSorted = this.ctx.sorting.sort ( notesByQuery ),
          notesUnique = _.uniq ( notesSorted ) as NoteObj[]; // If a note is in 2 sub-tags and we select a parent tag of both we will get duplicates

    return notesUnique;

  }

  /* API */

  getQuery = (): string => {

    return this.state.query;

  }

  setQuery = async ( query: string ) => {

    await this.setState ({ query });

    return this.update ();

  }

  focus = () => {

    const $input = $('#middlebar input[type="search"]');

    if ( !$input.length ) return;

    $input[0].focus ();

  }

  clear = () => {

    return this.setQuery ( '' );

  }

  getNoteIndex = ( note: NoteObj ): number => {

    return this.state.notes.indexOf ( note );

  }

  getNotes = (): NoteObj[] => {

    return this.state.notes;

  }

  setNotes = ( notes: NoteObj[] ) => {

    return this.setState ({ notes });

  }

  update = async ( prevNoteIndex?: number ) => {

    const tag = this.ctx.tag.get ();

    if ( !tag ) return;

    const notes = this._searchBy ( tag.path, this.state.query );

    if ( isShallowEqual ( this.state.notes, notes ) ) return; // Skipping unnecessary work

    await this.setNotes ( notes );

    await this.ctx.note.update ( prevNoteIndex );

    await this.ctx.multiEditor.update ();

  }

  navigate = ( modifier: number, wrap: boolean = true ) => {

    const {notes} = this.state,
          note = this.ctx.note.get (),
          index = ( note ? notes.indexOf ( note ) : -1 ) + modifier,
          indexWrapped = wrap ? ( notes.length + index ) % notes.length : index,
          noteNext = notes[indexWrapped];

    if ( noteNext ) return this.ctx.note.set ( noteNext, true );

    return; //TSC

  }

  previous = () => {

    return this.navigate ( -1 );

  }

  next = () => {

    return this.navigate ( 1 );

  }

}

/* EXPORT */

export default Search;
