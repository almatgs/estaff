function OnModuleInit()
{
	srcDoc = OpenDoc( 'cn_std_vocs.xml' );
	for ( stdVoc in srcDoc.TopElem )
		lib_voc.register_voc( stdVoc );

	if ( ! UseLds )
	{
		lib_voc.init_voc_std_data( card_object_types, FetchDoc( 'cn_std_card_object_types.xml' ).TopElem );

		lib_voc.init_voc_std_data( event_types, FetchDoc( 'cn_std_event_types.xml' ).TopElem );
		//lib_event.update_object_states_by_event_types( 'org' );


		lib_voc.init_voc_std_data( agents, OpenDoc( 'cn_std_agents.xml' ).TopElem );

		lib_voc.init_voc_std_elem( views, FetchDoc( 'cn_std_view_calendar_entries.xml' ).TopElem );
	}
}


function OnModuleStart()
{
	if ( UseLds )
	{
		lib_calendar.set_catalog_constraints();
		
		if ( LdsCurUserID != null )
		{
			set_default_view_filters( 'calendar' );
		}
	}
}


function set_default_view_filters( viewID )
{
	storedView = lib_view.get_store_view( viewID );
	storedElem = storedView.filter.OptChild( "user_id" );
	if ( storedElem == undefined )
	{
		storedElem = storedView.filter.AddDynamicChild( "user_id", 'integer' );
		storedElem.Value = LdsCurUserID;
		storedView.Doc.SetChanged( true );
	}
}




