describe('dataDepend', function() {

  beforeEach(module('dataDepend'));

  describe('API', function() {

    it('should resolve simple data', inject(function($rootScope, dataDependFactory) {

      // given
      var $data = dataDependFactory.create(),
          loadedFoo;

      // when
      $data.set('foo', function() {
        return 'FOO';
      });

      var status = $data.get('foo', function(foo) {
        loadedFoo = foo;
      });

      // then
      expect(status.$loaded).not.toBe(true);

      // but after
      $rootScope.$digest();

      // then
      expect(loadedFoo).toEqual("FOO");
      expect(status.$loaded).toBe(true);
    }));

    it('should resolve simple data', inject(function($rootScope, dataDependFactory) {

      // given
      var $data = dataDependFactory.create(),
          loadedFoo, loadedBar;

      // when
      $data.set([ 'foo', 'bar' ], function() {
        return [ 'FOO', 'BAR' ];
      });

      var fooStatus = $data.get('foo', function(foo) {
        loadedFoo = foo;
      });

      var barStatus = $data.get('bar', function(bar) {
        loadedBar = bar;
      });

      // then
      expect(fooStatus.$loaded).not.toBe(true);
      expect(barStatus.$loaded).not.toBe(true);

      // but after
      $rootScope.$digest();

      // then
      expect(loadedFoo).toEqual('FOO');
      expect(loadedBar).toEqual('BAR');

      expect(fooStatus.$loaded).toBe(true);
      expect(barStatus.$loaded).toBe(true);
    }));

    it('should resolve deferred data', inject(function($rootScope, $q, dataDependFactory) {

      // given
      var $data = dataDependFactory.create(),
          deferred = $q.defer(),
          loadedFoo;

      // when
      $data.set('foo', function() {
        return deferred.promise;
      });

      var status = $data.get('foo', function(foo) {
        loadedFoo = foo;
      });

      $rootScope.$digest();

      // first cycle
      // not resolved
      expect(status.$loaded).not.toBe(true);

      deferred.resolve('FOO');

      $rootScope.$digest();

      // second cycle
      // resolved
      expect(status.$loaded).toBe(true);
      expect(loadedFoo).toBe('FOO');
    }));

    it('should update on #changed', inject(function($rootScope, $q, dataDependFactory) {

      // given
      var $data = dataDependFactory.create(),
          setFoo = 'FOO',
          loadedFoo;

      // when
      $data.set('foo', function() {
        return setFoo;
      });

      var status = $data.get('foo', function(foo) {
        loadedFoo = foo;
      });

      $rootScope.$digest();

      // first cycle
      expect(status.$loaded).toBe(true);
      expect(loadedFoo).toBe(setFoo);

      // notify changed foo via #changed
      setFoo = 'BAR';
      $data.changed('foo');

      $rootScope.$digest();

      // second cycle
      expect(status.$loaded).toBe(true);
      expect(loadedFoo).toBe(setFoo);
    }));

    it('should update after #set', inject(function($rootScope, dataDependFactory) {

      // given
      var $data = dataDependFactory.create(),
          loadedFoo;

      // when
      $data.set('bar', 'BAR');

      $data.set('foo', [ 'bar', function(bar) {
        return bar;
      }]);

      var status = $data.get('foo', function(foo) {
        loadedFoo = foo;
      });

      $rootScope.$digest();

      // first cycle
      expect(status.$loaded).toBe(true);
      expect(loadedFoo).toBe('BAR');

      // change bar via #set
      $data.set('bar', 'FOOBAR');

      $rootScope.$digest();

      // second cycle
      expect(status.$loaded).toBe(true);
      expect(loadedFoo).toBe('FOOBAR');
    }));

    it('should provide access to scope bindings via #watchScope', inject(function($rootScope, dataDependFactory) {

      // given
      var $data = dataDependFactory.create($rootScope),
          foo, bar, fooBar;

      $rootScope.foo = 'FOO';

      // when
      $data.watchScope('bar');
      $data.watchScope('fooBar', 'foo.bar');
      $data.watchScope('foo');

      var status = $data.get([ 'foo', 'bar', 'fooBar' ], function(_foo, _bar, _fooBar) {
        foo = _foo;
        bar = _bar;
        fooBar = _fooBar;
      });

      $rootScope.$digest();

      // then
      expect(foo).toEqual($rootScope.foo);
      expect(bar).toEqual($rootScope.bar);
      expect(fooBar).not.toBeDefined();

      // when changes in scope

      $rootScope.foo = { bar: 'FOOBAR' };

      $rootScope.$digest();

      expect(foo).toBe($rootScope.foo);
      expect(bar).toEqual($rootScope.bar);
      expect(fooBar).toBe($rootScope.foo.bar);

      // when removing scope binding

      delete $rootScope.foo;

      $rootScope.$digest();

      expect(foo).toBe($rootScope.foo);
      expect(bar).toEqual($rootScope.bar);
      expect(fooBar).not.toBeDefined();
    }));

    it('should provide access to old scope bindings via #watchScope and :old suffix', inject(function($rootScope, dataDependFactory) {

      // given
      var $data = dataDependFactory.create($rootScope),
          foo, fooOld, bar, barOld;

      $rootScope.foo = 'FOO';

      // when
      $data.watchScope('bar', 'bar');
      $data.watchScope('foo');

      var status = $data.get([ 'foo', 'foo:old', 'bar', 'bar:old'], function(_foo, _fooOld, _bar, _barOld) {
        foo = _foo;
        fooOld = _fooOld;
        bar = _bar;
        barOld = _barOld;
      });

      $rootScope.$digest();

      // then
      expect(foo).toEqual($rootScope.foo);
      expect(fooOld).toEqual(null);
      expect(bar).toEqual($rootScope.bar);
      expect(barOld).toEqual(null);

      // when changes in scope

      $rootScope.foo = 'FOOBAR';
      $rootScope.bar = 'BAR';

      $rootScope.$digest();

      expect(foo).toEqual($rootScope.foo);
      expect(fooOld).toEqual('FOO');
      expect(bar).toEqual($rootScope.bar);
      expect(barOld).toEqual(null);
      
      // when removing scope binding

      delete $rootScope.foo;

      $rootScope.$digest();

      expect(foo).toBe($rootScope.foo);
      expect(fooOld).toEqual('FOOBAR');
    })); 
  });

  describe('provider', function() {

    var __dataFactory;

    beforeEach(inject(function(dataProviderFactory) {
      __dataFactory = dataProviderFactory;
    }));

    function createProviderFactory(providers) {

      if (!providers) {
        providers = {};
      }

      function toArray(arrayLike) {
        return Array.prototype.slice.apply(arrayLike);
      }
      
      return function createProvider(options) {

        options = angular.extend(options, { registry: providers });

        var produces = options.produces;
        var provider = __dataFactory.create(options);

        if (angular.isArray(produces)) {
          angular.forEach(produces, function(name) {
            providers[name] = __dataFactory.filtered(provider, name);
          });
        } else {
          providers[produces] = provider;
        }

        return provider;
      };
    }

    function spyOnFunction(fn) {
      return jasmine.createSpy().andCallFake(fn);
    }

    it('should resolve data using promise', inject(function($rootScope) {

      var createProvider = createProviderFactory();

      var provider = createProvider({
        produces: 'foo', 
        factory: function() {
          return 'FOO';
        }
      });

      var value;

      // when
      var getter = provider.resolve();

      // then
      expect(getter.then).toBeDefined();

      getter.then(function(v) {
        value = v;
      });

      // trigger value change
      $rootScope.$digest();

      expect(value).toBe('FOO');
    }));

    it('should resolve dependent data', inject(function($rootScope) {

      var createProvider = createProviderFactory();

      var fooProvider = createProvider({
        produces: 'foo', 
        factory: function() {
          return 'FOO';
        }
      });

      var barProvider = createProvider({ 
        produces: 'bar', 
        dependencies: ['foo'],
        factory: function(foo) {
          return foo;
        }
      });

      // when
      barProvider.resolve();

      $rootScope.$digest();

      // then
      expect(barProvider.get()).toBe('FOO');
    }));

    it('should resolve dependent data on #set', inject(function($rootScope) {

      var createProvider = createProviderFactory();

      var fooProvider = createProvider({
        produces: 'foo', 
        value: 'FOO'
      });

      var barProvider = createProvider({ 
        produces: 'bar', 
        dependencies: ['foo'],
        factory: function(foo) {
          return foo;
        }
      });

      // when
      barProvider.resolve();
      $rootScope.$digest();


      fooProvider.set('BAR');
      barProvider.resolve();
      $rootScope.$digest();

      expect(barProvider.get()).toBe('BAR');
    }));

    it('should resolve data via promise', inject(function($rootScope, $q) {

      var createProvider = createProviderFactory();

      var fooDeferred;

      var fooProvider = createProvider({
        produces: 'foo', 
        factory: function() {
          fooDeferred = $q.defer();

          return fooDeferred.promise;
        }
      });

      var barProvider = createProvider({ 
        produces: 'bar', 
        dependencies: ['foo'],
        eager: true,
        factory: function(foo) {
          return foo;
        }
      });

      // when
      $rootScope.$digest();

      // then
      expect(barProvider.get()).not.toBeDefined();
      expect(fooProvider.get()).not.toBeDefined();

      // but when ...
      fooDeferred.resolve('FOO');
      $rootScope.$digest();

      // then
      expect(barProvider.get()).toBe('FOO');
      expect(fooProvider.get()).toBe('FOO');
    }));

    it('should produce multiple values', inject(function($rootScope) {

      var createProvider = createProviderFactory();

      var rootProvider = createProvider({
        produces: [ 'a', 'b' ],
        factory: function() {
          return [ 'A', 'B' ];
        }
      });

      var cProvider = createProvider({
        produces: 'c', 
        dependencies: [ 'a' ],
        factory: function(a) {
          return a + '-C';
        }
      });

      var dProvider = createProvider({
        produces: 'd', 
        dependencies: [ 'b' ],
        factory: function(b) {
          return b + '-D';
        }
      });

      var eProvider = createProvider({
        produces: 'e', 
        dependencies: [ 'a', 'b' ],
        factory: function(a, b) {
          return a + '-' + b + '-E';
        }
      });

      // when
      rootProvider.resolve();
      $rootScope.$digest();

      // then
      expect(rootProvider.get()).toEqual([ 'A', 'B' ]);

      // but when
      cProvider.resolve();
      $rootScope.$digest();

      expect(cProvider.get()).toEqual('A-C');

      // but when
      dProvider.resolve();
      $rootScope.$digest();

      expect(dProvider.get()).toEqual('B-D');

      // but when
      eProvider.resolve();
      $rootScope.$digest();

      expect(eProvider.get()).toEqual('A-B-E');
    }));

    it('should handle nested dependent data changes (X)', inject(function($rootScope) {

      var createProvider = createProviderFactory();

      var a1Provider = createProvider({
        produces: 'a1', 
        value: 'A1'
      });

      var a2Provider = createProvider({
        produces: 'a2', 
        value: 'A2'
      });

      var bFactory = spyOnFunction(function (a1, a2) {
        return a1 + '-' + a2;
      });

      var bProvider = createProvider({
        produces: 'b',
        dependencies: [ 'a1', 'a2' ], 
        factory: bFactory
      });

      var c1Factory = spyOnFunction(function (b) {
        return b + '-' + 'C1';
      });

      var c1Provider = createProvider({
        produces: 'c1', 
        dependencies: [ 'b' ],
        eager: true, 
        factory: c1Factory
      });

      var c2Factory = spyOnFunction(function (b) {
        return b + '-' + 'C2';
      });

      var c2Provider = createProvider({
        produces: 'c2', 
        dependencies: [ 'b' ],
        eager: true, 
        factory: c2Factory
      });

      // when (1)
      $rootScope.$digest();

      // then
      expect(bProvider.get()).toBe('A1-A2');
      expect(c1Provider.get()).toBe('A1-A2-C1');
      expect(c2Provider.get()).toBe('A1-A2-C2');

      // validate calls
      expect(bFactory.calls.length).toBe(1);
      expect(c1Factory.calls.length).toBe(1);
      expect(c2Factory.calls.length).toBe(1);

      // when (2)
      a2Provider.set('XX');

      $rootScope.$digest();

      // then
      expect(bProvider.get()).toBe('A1-XX');
      expect(c1Provider.get()).toBe('A1-XX-C1');
      expect(c2Provider.get()).toBe('A1-XX-C2');

      // validate calls
      expect(bFactory.calls.length).toBe(2);
      expect(c1Factory.calls.length).toBe(2);
      expect(c2Factory.calls.length).toBe(2);
    }));

    it('should handle nested dependent data changes (<>)', inject(function($rootScope) {

      var createProvider = createProviderFactory();

      var aProvider = createProvider({
        produces: 'a', 
        value: 'A'
      });

      var b1Factory = spyOnFunction(function (a) {
        return a + '-B1';
      });
      
      var b1Provider = createProvider({
        produces: 'b1',
        dependencies: [ 'a' ], 
        factory: b1Factory
      });

      var b2Factory = spyOnFunction(function (a) {
        return a + '-B2';
      });

      var b2Provider = createProvider({
        produces: 'b2', 
        dependencies: [ 'a' ],
        factory: b2Factory
      });

      var cFactory = spyOnFunction(function (b1, b2) {
        return b1 + '-' + b2;
      });

      var cProvider = createProvider({
        produces: 'c', 
        dependencies: [ 'b1', 'b2' ],
        eager: true, 
        factory: cFactory
      });

      // when (1)
      $rootScope.$digest();

      // then
      // validate results
      expect(b1Provider.get()).toBe('A-B1');
      expect(b2Provider.get()).toBe('A-B2');
      expect(cProvider.get()).toBe('A-B1-A-B2');

      // validate calls
      expect(b1Factory.calls.length).toBe(1);
      expect(b2Factory.calls.length).toBe(1);
      expect(cFactory.calls.length).toBe(1);

      // when (2)
      aProvider.set('XX');

      $rootScope.$digest();

      // then
      // validate results
      expect(b1Provider.get()).toBe('XX-B1');
      expect(b2Provider.get()).toBe('XX-B2');
      expect(cProvider.get()).toBe('XX-B1-XX-B2');

      // validate calls
      expect(b1Factory.calls.length).toBe(2);
      expect(b2Factory.calls.length).toBe(2);
      expect(cFactory.calls.length).toBe(2);
    }));

    it('should not call unused data factories', inject(function($rootScope) {

      var createProvider = createProviderFactory();

      var aProvider = createProvider({
        produces: 'a', 
        value: 'A'
      });

      var b1Factory = spyOnFunction(function (a) {
        return a + '-B1';
      });
      
      var b1Provider = createProvider({
        produces: 'b1',
        dependencies: [ 'a' ], 
        eager: true,
        factory: b1Factory
      });

      var b2Factory = spyOnFunction(function (a) {
        return a + '-B2';
      });

      var b2Provider = createProvider({
        produces: 'b2', 
        dependencies: [ 'a' ],
        factory: b2Factory
      });

      // when (1)
      $rootScope.$digest();

      // then
      // validate results
      expect(b1Provider.get()).toBe('A-B1');
      expect(b2Provider.get()).not.toBeDefined();

      // validate calls
      expect(b1Factory.calls.length).toBe(1);
      expect(b2Factory.calls.length).toBe(0);

      // when (2)
      aProvider.set('XX');

      $rootScope.$digest();

      // then
      // validate results
      expect(b1Provider.get()).toBe('XX-B1');
      expect(b2Provider.get()).not.toBeDefined();

      // validate calls
      expect(b1Factory.calls.length).toBe(2);
      expect(b2Factory.calls.length).toBe(0);
    }));
   
    it('should throw error when setting value on factory defined provider', inject(function($rootScope) {

      var createProvider = createProviderFactory();
      
      var fooProvider = createProvider({
        produces: 'foo',
        factory: function (a) {
          return 'FOO';
        }
      });

      expect(function() {
        fooProvider.set('BAR');
      }).toThrow
    }));
  });
});