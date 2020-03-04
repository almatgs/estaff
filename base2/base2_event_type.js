function OnInit()
{
	UpdateOccurrences();
}


function OnBeforeSave()
{
	if ( ! use_end_date )
		has_long_duration = false;

	if ( is_approval )
		use_participants = true;

	if ( target_object_type_id.ByValueExists( 'org' ) )
		use_org = true;
}


function main_occurrence()
{
	return occurrences.ObtainChildByKey( '' );
}


function UpdateOccurrences()
{
	if ( ( occurrence = occurrences.GetOptChildByKey( 'main' ) ) != undefined )
	{
		occurrence.id = '';
	}
	else if ( occurrences.ChildNum == 0 )
	{
		occurrences.ObtainChildByKey( '' );
	}
}


function SortOccurrences()
{
	idArray = ['scheduled', 'started', '', 'succeeded', 'failed', 'cancelled'];
	
	occurrences.Sort( 'is_std', '-', 'idArray.indexOf( id )', '+' );
}


function HandleAddOccurrence( occurrenceID )
{
	occurrence = occurrences.ObtainChildByKey( occurrenceID );
	SortOccurrences();
	Doc.SetChanged( true );
}


function HandleAddCustomOccurrence()
{
	lib_base.ask_warning_to_continue( ActiveScreen, UiText.messages.custom_occurrence_will_be_added );

	occurrenceID = BuildNewCustomOccurrenceID();
	occurrence = occurrences.ObtainChildByKey( occurrenceID );
	Doc.SetChanged( true );
	Screen.Update();
	Screen.ExposeItemBySource( occurrence.name );
}


function BuildNewCustomOccurrenceID()
{
	for ( baseIndex = 1; ; baseIndex++ )
	{
		occurrenceID = 'completion_state_' + StrInt( baseIndex, 2 );
		if ( occurrences.GetOptChildByKey( occurrenceID ) == undefined )
			break; 
	}

	return occurrenceID;
}


function get_short_name()
{
		if ( short_name.HasValue )
			return short_name;
		else
			return name;
}

function get_image_url()
{
		if ( image_url.HasValue )
			return image_url;
		else
			return '//base_pict/event.ico';
}

function get_object_name()
{
	if ( is_poll && AppModuleUsed( 'module_rgs' ) )
		return 'rr_poll';

	if ( is_derived )
		return id;
	else if ( is_calendar_entry )
		return 'calendar_entry';
	else if ( is_poll )
		return 'rr_poll';
	else
		return 'event';
}


function get_occurrence( occurrenceID )
{
	if ( occurrences.ChildNum == 0 && occurrenceID == '' )
		return occurrences.ObtainChildByKey( occurrenceID );

	return occurrences.GetChildByKey( occurrenceID );
}


function get_opt_occurrence( occurrenceID )
{
	oc = occurrences.GetOptChildByKey( occurrenceID );
	if ( oc == undefined || ! oc.is_active )
		return undefined;

	return oc;
}


function has_occurrence( occurrenceID )
{
	if ( occurrences.ChildNum == 0 && occurrenceID == '' )
		return true;

	return ( get_opt_occurrence( occurrenceID ) != undefined );
}


function get_sorted_occurrences()
{
	array = ArraySelect( this.occurrences, 'is_active' );
	return array;
}


function get_forward_occurrences()
{
	array = ArraySelect( get_sorted_occurrences(), 'id != \'scheduled\'' );

	if ( has_occurrence( 'succeeded' ) )
		array = ArraySelect( array, 'id.HasValue' );

	return array;
}


function get_init_occurrence()
{
		return ArrayFirstElem( get_sorted_occurrences() );
}

function get_rollback_occurrence_id()
{
		if ( has_occurrence( 'scheduled' ) )
			return 'scheduled';

		return '';
}

function get_creation_date_title()
{
		if ( creation_date_title.HasValue )
			return creation_date_title;

		return UiText.titles.default_creation_date_title;
}



function get_object_states_voc()
{
		if ( ! target_object_type_id.HasValue )
			return undefined;

		return DefaultDb.GetOptCatalog( ArrayFirstElem( target_object_type_id ) + '_states' );
}

function get_object_states_array()
{
		statesVoc = get_object_states_voc();
		if ( statesVoc == undefined )
			return Array();

		array = ArraySelectByKey( statesVoc, id, 'event_type_id' );
		return array;
}

function get_object_state( occurrenceID )
{
		statesVoc = get_object_states_voc();
		if ( statesVoc == undefined )
			return undefined;

		return ArrayOptFind( statesVoc, 'event_type_id == ' + CodeLiteral( id ) + ' && event_occurrence_id == ' + CodeLiteral( occurrenceID ) );
}


function get_main_state()
{
		statesVoc = get_object_states_voc();
		if ( statesVoc == undefined )
			return undefined;

		return ArrayOptFindByKey( statesVoc, id );
}


function GetOccurrenceStateName( occurrence )
{
}