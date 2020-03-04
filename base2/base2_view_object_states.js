function build_array_elem()
{
	arrayElem = CreateDynamicElem( 'array' );
	
	for ( state in candidate_states )
	{
		if ( ! state.is_standalone )
			continue;

		eventTypeElem = state.Clone();
		arrayElem.AddChildElem( eventTypeElem );

		eventTypeElem.AddDynamicChild( 'is_state_elem', 'bool' ).Value = true;
	}

	for ( eventType in ArraySort( event_types, 'order_index', '+' ) )
	{
		if ( ! eventType.is_state )
			continue;

		if ( ! eventType.target_object_type_id.ByValueExists( 'candidate' ) )
			continue;

		eventTypeElem = eventType.Clone();
		arrayElem.AddChildElem( eventTypeElem );

		if ( eventType.use_occurrences )
		{
			eventTypeElem.AddDynamicChild( 'array' );

			for ( occurrence in eventTypeElem.occurrences )
			{
				occurrence.name = occurrence.get_name();
				occurrence.text_color = occurrence.get_text_color();
				occurrence.bk_color = occurrence.get_bk_color();
				occurrence.AddDynamicChild( 'is_active', 'bool' ).Value = eventType.is_active;
				occurrence.AddDynamicChild( 'is_state_elem', 'bool' ).Value = true;

				eventTypeElem.array.AddChildElem( occurrence );
			}

			eventTypeElem.AddDynamicChild( 'is_state_elem', 'bool' ).Value = false;
		}
		else
		{
			occurrence = eventType.get_occurrence( '' );

			//eventTypeElem.name = occurrence.get_name();
			eventTypeElem.AddDynamicChild( 'is_state_elem', 'bool' ).Value = true;
		}
	}

	//alert( arrayElem.Xml );
	array_elem_ref = arrayElem;
}


